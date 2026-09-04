// ==============================================================================
// STUNNING BIRDS ATELIER - RAZORPAY PAYMENT INTEGRATION SERVICE
// Integrates with server / Supabase Edge Functions for secure Razorpay Test & Live checkout.
// ==============================================================================

import { supabase } from '../supabaseClient';
import {
  RazorpayOrderResponse,
  RazorpayPaymentSuccessResult,
  RazorpayVerificationResponse,
} from '../types';

/**
 * Resolves API endpoint URL across development, preview, and production environments.
 * Supports VITE_API_URL / VITE_BACKEND_URL / VITE_APP_URL if defined, otherwise uses relative API paths.
 */
export const getApiUrl = (endpoint: string): string => {
  const envApiUrl = (
    (import.meta as any).env?.VITE_API_URL ||
    (import.meta as any).env?.VITE_BACKEND_URL ||
    (import.meta as any).env?.VITE_APP_URL ||
    ''
  ).trim().replace(/\/+$/, '');

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return envApiUrl ? `${envApiUrl}${cleanEndpoint}` : cleanEndpoint;
};

// Fetch Public Key ID from server /api/payments/key if not provided in order response
export async function fetchRazorpayPublicKey(): Promise<string> {
  try {
    const res = await fetch(getApiUrl('/api/payments/key'));
    if (res.ok) {
      const data = await res.json();
      if (data.keyId) return data.keyId;
    }
  } catch (e) {
    console.warn('Failed to fetch Razorpay public key ID from server:', e);
  }
  throw new Error('Razorpay public key ID is not configured on the server. Please set RAZORPAY_KEY_ID in environment variables.');
}

// 1. Load Razorpay Checkout SDK Script dynamically
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.getElementById('razorpay-checkout-script') as HTMLScriptElement;
    if (existingScript) {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      console.log('Razorpay Checkout SDK script loaded successfully.');
      resolve(true);
    };
    script.onerror = () => {
      console.error('Failed to load Razorpay checkout.js script.');
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

export interface CreateOrderParams {
  amount: number; // in Rupees (e.g. 14990)
  subtotal?: number;
  couponCode?: string;
  currency?: string;
  receipt?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  notes?: Record<string, string>;
}

// Validate coupon against server API
export async function validateCouponCode(params: {
  couponCode: string;
  subtotal: number;
  customerEmail?: string;
  userId?: string;
}): Promise<{
  valid: boolean;
  message: string;
  code?: string;
  discountPercentage?: number;
  discountAmount?: number;
  subtotal?: number;
  taxes?: number;
  total?: number;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(getApiUrl('/api/coupons/validate'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      couponCode: params.couponCode,
      subtotal: params.subtotal,
      customerEmail: params.customerEmail,
      userId: params.userId || session?.user?.id,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      valid: false,
      message: data.message || data.error || 'Invalid coupon code or not eligible for first order discount.',
    };
  }

  return data;
}

// 2. Create Razorpay Order via Express Server API
export async function createRazorpayOrder(
  params: CreateOrderParams
): Promise<RazorpayOrderResponse> {
  const { amount, subtotal, couponCode, currency = 'INR', receipt, customer, notes } = params;
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  // Call Express backend endpoint /api/payments/create-order
  const response = await fetch(getApiUrl('/api/payments/create-order'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amount,
      subtotal,
      couponCode,
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      customer,
      notes: {
        brand: 'STUNNING BIRDS ATELIER',
        ...notes,
      },
    }),
  });

  if (response.ok) {
    // Check if the response returned an HTML document (such as SPA index.html fallback)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const htmlText = await response.text().catch(() => '');
      console.error('Payment order creation returned HTML instead of JSON:', htmlText.substring(0, 300));
      throw new Error(
        'Payment API returned HTML (index.html) instead of order JSON. Please verify that your Node.js backend server is running and handling /api requests.'
      );
    }

    const rawData = await response.json().catch(() => null);
    if (!rawData) {
      throw new Error('Empty or unparseable JSON response received from payment server.');
    }

    // Extract order ID from any potential field representation (camelCase, snake_case, or nested data)
    const orderId =
      rawData.orderId ||
      rawData.order_id ||
      rawData.id ||
      rawData.data?.orderId ||
      rawData.data?.order_id ||
      rawData.data?.id ||
      rawData.order?.id ||
      rawData.order?.orderId ||
      '';

    if (orderId) {
      // Calculate or extract amount in paise for Razorpay Checkout
      const parsedAmount =
        rawData.amount ??
        rawData.data?.amount ??
        rawData.order?.amount ??
        (amount ? (amount < 500000 ? Math.round(amount * 100) : Math.round(amount)) : 0);

      // Extract keyId from response or fallback
      let keyId =
        rawData.keyId ||
        rawData.key_id ||
        rawData.key ||
        rawData.data?.keyId ||
        rawData.data?.key_id ||
        rawData.data?.key ||
        '';

      if (!keyId) {
        try {
          keyId = await fetchRazorpayPublicKey();
        } catch {
          // If server /key fails, let launchRazorpayCheckout handle or fallback
        }
      }

      const currency =
        rawData.currency ||
        rawData.data?.currency ||
        rawData.order?.currency ||
        'INR';

      const normalized: RazorpayOrderResponse = {
        success: true,
        orderId: String(orderId),
        order_id: String(orderId),
        id: String(orderId),
        amount: Number(parsedAmount),
        currency: String(currency).toUpperCase(),
        keyId: String(keyId || ''),
        key_id: String(keyId || ''),
        key: String(keyId || ''),
        receipt: rawData.receipt || rawData.data?.receipt || receipt,
        status: rawData.status || rawData.data?.status || 'created',
        isTestMode: rawData.isTestMode ?? rawData.data?.isTestMode ?? true,
        notes: rawData.notes || rawData.data?.notes || notes,
      };

      return normalized;
    }

    const errorMsg =
      rawData.error ||
      rawData.message ||
      rawData.description ||
      'Invalid response structure received from payment server.';
    throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
  }

  const errData = await response.json().catch(() => ({}));
  const errorMessage =
    errData?.error ||
    errData?.message ||
    `Payment server error (${response.status}: ${response.statusText || 'Failed to create order'}).`;
  console.error('Backend /api/payments/create-order error:', errorMessage, errData);
  throw new Error(errorMessage);
}

export interface VerifyPaymentParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  order_id?: string;
}

// 3. Verify Razorpay Payment Signature on Server (Express Backend Only)
export async function verifyRazorpayPayment(
  params: VerifyPaymentParams
): Promise<RazorpayVerificationResponse> {
  const response = await fetch(getApiUrl('/api/payments/verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (response.ok) {
    const data = await response.json().catch(() => null);
    if (data && data.success && data.verified) {
      return data as RazorpayVerificationResponse;
    }
    throw new Error(data?.error || 'Payment signature verification could not be validated.');
  }

  const errData = await response.json().catch(() => ({}));
  const errorMessage =
    errData?.error ||
    errData?.message ||
    `Payment signature verification failed (${response.status}: ${response.statusText || 'Verification rejected'}).`;
  console.error('Backend /api/payments/verify error:', errorMessage, errData);
  throw new Error(errorMessage);
}

export interface OpenRazorpayOptions {
  amount: number; // in INR (e.g. 14990)
  subtotal?: number;
  couponCode?: string;
  orderNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  preferredMethod?: string;
  notes?: Record<string, string>;
  onSuccess: (result: RazorpayPaymentSuccessResult) => void;
  onError: (error: any) => void;
  onDismiss?: () => void;
}

// 4. Main Helper: Initialize and Launch Razorpay Checkout Modal
export async function launchRazorpayCheckout(options: OpenRazorpayOptions): Promise<void> {
  const {
    amount,
    subtotal,
    couponCode,
    orderNumber,
    customerName,
    customerEmail,
    customerPhone,
    preferredMethod,
    notes,
    onSuccess,
    onError,
    onDismiss,
  } = options;

  try {
    // 1. Ensure the official Razorpay JS SDK is loaded
    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded || !(window as any).Razorpay) {
      throw new Error('Razorpay Checkout SDK failed to load. Please check your internet connection.');
    }

    // 2. Create order on server / Supabase Edge Function to obtain official order_id with server-side coupon validation
    const orderResponse = await createRazorpayOrder({
      amount,
      subtotal,
      couponCode,
      receipt: orderNumber || `rcpt_${Date.now()}`,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      notes,
    });

    const finalOrderId = orderResponse.orderId || orderResponse.order_id || orderResponse.id;
    if (!orderResponse || !finalOrderId) {
      throw new Error('Failed to generate secure Razorpay order on server.');
    }

    let keyId = orderResponse.keyId || orderResponse.key_id || orderResponse.key;
    if (!keyId) {
      keyId = await fetchRazorpayPublicKey();
    }

    // Clean phone number for prefill (e.g., 918582861387 or 8582861387)
    const sanitizedPhone = (customerPhone || '8582861387')
      .replace(/\s+/g, '')
      .replace(/[^0-9+]/g, '');

    // Determine specific prefill method if user selected one in UI
    let prefillMethod: string | undefined = undefined;
    if (preferredMethod) {
      const lower = preferredMethod.toLowerCase();
      if (lower.includes('upi')) {
        prefillMethod = 'upi';
      } else if (lower.includes('card') || lower.includes('debit') || lower.includes('credit')) {
        prefillMethod = 'card';
      } else if (lower.includes('netbanking')) {
        prefillMethod = 'netbanking';
      } else if (lower.includes('wallet')) {
        prefillMethod = 'wallet';
      }
    }

    // 3. Configure and launch official Razorpay Checkout Modal
    // Explicitly configure display blocks to ensure UPI (QR Code, Intent & VPA) is rendered alongside Cards & Netbanking
    const rzpOptions: any = {
      key: keyId,
      amount: orderResponse.amount,
      currency: orderResponse.currency || 'INR',
      name: 'STUNNING BIRDS ATELIER',
      description: 'Bespoke Leather Commission',
      image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=200&q=80',
      order_id: finalOrderId,
      prefill: {
        name: customerName,
        email: customerEmail,
        contact: sanitizedPhone,
        ...(prefillMethod ? { method: prefillMethod } : {}),
      },
      notes: {
        brand: 'STUNNING BIRDS ATELIER',
        address: '6E/1B Topsia 2nd Lane, Kolkata 700039',
        ...notes,
      },
      theme: {
        color: '#181614', // Deep Atelier Black
        backdrop_color: 'rgba(24, 22, 20, 0.7)',
      },
      config: {
        display: {
          blocks: {
            upi_block: {
              name: 'UPI / QR Code',
              instruments: [
                {
                  method: 'upi',
                },
              ],
            },
            cards_block: {
              name: 'Cards & Other Methods',
              instruments: [
                {
                  method: 'card',
                },
                {
                  method: 'netbanking',
                },
                {
                  method: 'wallet',
                },
              ],
            },
          },
          sequence: ['block.upi_block', 'block.cards_block'],
          preferences: {
            show_default_blocks: true,
          },
        },
      },
      modal: {
        backdropclose: false,
        escape: true,
        handleback: true,
        ondismiss: () => {
          console.log('Razorpay modal dismissed by user');
          if (onDismiss) onDismiss();
        },
      },
      handler: async (response: RazorpayPaymentSuccessResult) => {
        console.log('Razorpay payment response received from client modal:', response);
        try {
          // Cryptographic signature verification on server
          const verificationResult = await verifyRazorpayPayment({
            razorpay_order_id: response.razorpay_order_id || finalOrderId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            order_id: orderNumber,
          });

          if (verificationResult.verified) {
            console.log('Payment verified successfully on server');
            onSuccess({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id || finalOrderId,
              razorpay_signature: response.razorpay_signature,
            });
          } else {
            throw new Error(verificationResult.message || 'Signature verification failed');
          }
        } catch (verifyErr: any) {
          console.error('Signature verification error on server:', verifyErr);
          onError(verifyErr);
        }
      },
    };

    const razorpayInstance = new (window as any).Razorpay(rzpOptions);

    razorpayInstance.on('payment.failed', (failedResponse: any) => {
      console.error('Razorpay payment transaction failed:', failedResponse);
      const errMsg = failedResponse?.error?.description || failedResponse?.error?.reason || 'Payment was declined or cancelled.';
      onError(new Error(errMsg));
    });

    // Open the Razorpay Checkout Modal
    razorpayInstance.open();
  } catch (err: any) {
    console.error('Razorpay initialization error:', err);
    onError(err);
  }
}
