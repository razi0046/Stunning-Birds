// Supabase Edge Function: verify-razorpay-payment
// Cryptographically verifies Razorpay payment signatures server-side and updates database status.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';

const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  order_id?: string; // Internal order ID e.g. '#ORD-1092'
}

// Cryptographic HMAC SHA256 signature generator using Web Crypto API
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

    const body: VerifyPaymentRequest = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return new Response(
        JSON.stringify({ error: 'Missing payment identifiers (razorpay_order_id or razorpay_payment_id)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!RAZORPAY_KEY_SECRET) {
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          error: 'Payment verification failed: RAZORPAY_KEY_SECRET is not configured on the server.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!razorpay_signature) {
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          error: 'Missing mandatory razorpay_signature for payment verification.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = await generateHmacSha256(RAZORPAY_KEY_SECRET, payload);
    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          error: 'Invalid Razorpay payment signature. Payment cannot be verified.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order in Supabase database if order_id and credentials are present
    if (order_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Fetch current timeline if available to add confirmed step
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('timeline')
          .eq('id', order_id)
          .maybeSingle();

        let updatedTimeline = existingOrder?.timeline || [];
        if (Array.isArray(updatedTimeline) && updatedTimeline.length > 0) {
          updatedTimeline = updatedTimeline.map((step: any) => {
            if (step.key === 'placed' || step.key === 'confirmed') {
              return { ...step, completed: true, current: false };
            }
            if (step.key === 'atelier') {
              return { ...step, current: true, completed: false };
            }
            return step;
          });
        }

        await supabase
          .from('orders')
          .update({
            payment_status: 'Paid',
            fulfillment_status: 'CONFIRMED',
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature: razorpay_signature || null,
            timeline: updatedTimeline,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order_id);
      } catch (dbErr) {
        console.warn('Could not update order in Supabase directly from edge function:', dbErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        message: 'Razorpay payment successfully verified.',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        internalOrderId: order_id,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error in verify-razorpay-payment:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
