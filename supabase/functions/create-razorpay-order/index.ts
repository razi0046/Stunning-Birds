// Supabase Edge Function: create-razorpay-order
// Handles secure Razorpay order generation on the server without exposing secrets to client.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Environment variables configuration
// Add these to your Supabase Project: Project Settings -> Edge Functions -> Secrets
// or via Supabase CLI: supabase secrets set RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=...
const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') || '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || '';

interface CreateOrderRequest {
  amount: number; // in INR (e.g. 14990) or in paise
  currency?: string; // 'INR'
  receipt?: string;
  notes?: Record<string, string>;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
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

    const body: CreateOrderRequest = await req.json();
    const { amount, currency = 'INR', receipt, notes, customer } = body;

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Valid payment amount is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Razorpay requires amount in subunits (paise for INR). 
    // If amount is less than 1000000, assume it's in INR and multiply by 100
    const amountInPaise = amount < 500000 ? Math.round(amount * 100) : Math.round(amount);
    const orderReceipt = (receipt || `rcpt_${Date.now()}`).substring(0, 40);

    const isPlaceholderKey =
      !RAZORPAY_KEY_ID ||
      !RAZORPAY_KEY_SECRET ||
      RAZORPAY_KEY_ID.includes('YOUR_') ||
      RAZORPAY_KEY_ID.includes('PLACEHOLDER') ||
      RAZORPAY_KEY_SECRET.includes('YOUR_');

    // 1. If Razorpay credentials are fully provided, make the real API request to Razorpay
    if (!isPlaceholderKey) {
      const basicAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

      const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: currency.toUpperCase(),
          receipt: orderReceipt,
          payment_capture: 1, // Auto-capture payment
          notes: {
            brand: 'STUNNING BIRDS ATELIER',
            customer_name: customer?.name || 'Valued Patron',
            customer_email: customer?.email || '',
            ...notes,
          },
        }),
      });

      if (!razorpayResponse.ok) {
        const errorData = await razorpayResponse.json();
        console.error('Razorpay API error:', errorData);
        return new Response(
          JSON.stringify({
            error: errorData.error?.description || 'Failed to create Razorpay order',
            details: errorData,
          }),
          { status: razorpayResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const orderData = await razorpayResponse.json();

      return new Response(
        JSON.stringify({
          success: true,
          orderId: orderData.id,
          amount: orderData.amount,
          currency: orderData.currency,
          keyId: RAZORPAY_KEY_ID,
          receipt: orderData.receipt,
          status: orderData.status,
          isTestMode: RAZORPAY_KEY_ID.startsWith('rzp_test_'),
          notes: orderData.notes,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // When live credentials are not configured, reject order creation
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Razorpay gateway configuration error: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured on the server.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in create-razorpay-order:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
