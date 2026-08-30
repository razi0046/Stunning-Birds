// Supabase Edge Function: razorpay-webhook
// Securely processes webhook notifications from Razorpay (e.g. order.paid, payment.captured, payment.failed)
// to ensure orders in Supabase are updated accurately even if the user closes their browser.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || Deno.env.get('RAZORPAY_KEY_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

async function generateHmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    const isPlaceholderSecret =
      !RAZORPAY_WEBHOOK_SECRET ||
      RAZORPAY_WEBHOOK_SECRET.includes('YOUR_') ||
      RAZORPAY_WEBHOOK_SECRET.includes('PLACEHOLDER');

    // Verify webhook signature if real secret is configured
    if (!isPlaceholderSecret && signature) {
      const expectedSignature = await generateHmacSha256(RAZORPAY_WEBHOOK_SECRET, rawBody);
      if (expectedSignature !== signature) {
        console.error('Invalid Razorpay webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    console.log(`Razorpay Webhook received event: ${eventType}`);

    const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;

    if (eventType === 'order.paid' || eventType === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;

      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
      const razorpayPaymentId = paymentEntity?.id;
      const receipt = orderEntity?.receipt || paymentEntity?.notes?.receipt;

      if (supabase && (razorpayOrderId || receipt)) {
        // Query order by razorpay_order_id or receipt/id
        let query = supabase.from('orders').update({
          payment_status: 'Paid',
          fulfillment_status: 'CONFIRMED',
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          updated_at: new Date().toISOString(),
        });

        if (razorpayOrderId) {
          query = query.eq('razorpay_order_id', razorpayOrderId);
        } else if (receipt) {
          query = query.eq('id', receipt);
        }

        const { error } = await query;
        if (error) {
          console.error('Failed to update order status via webhook:', error);
        } else {
          console.log(`Order status updated to Paid via webhook for ${razorpayOrderId || receipt}`);
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const receipt = paymentEntity?.notes?.receipt;

      if (supabase && (razorpayOrderId || receipt)) {
        let query = supabase.from('orders').update({
          payment_status: 'Failed',
          updated_at: new Date().toISOString(),
        });

        if (razorpayOrderId) {
          query = query.eq('razorpay_order_id', razorpayOrderId);
        } else if (receipt) {
          query = query.eq('id', receipt);
        }

        await query;
      }
    }

    return new Response(
      JSON.stringify({ status: 'ok', event: eventType }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error handling Razorpay webhook:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
