// ==============================================================================
// STUNNING BIRDS ATELIER - EMAIL SERVICE
// Invokes Supabase Edge Function 'send-order-email' to send automated confirmation emails via Resend.
// ==============================================================================

import { supabase } from '../supabaseClient';

export interface SendOrderEmailResult {
  success: boolean;
  message?: string;
  alreadySent?: boolean;
  orderId?: string;
  recipient?: string;
  emailId?: string;
  error?: string;
}

/**
 * Triggers the Supabase Edge Function 'send-order-email' for a successfully placed order.
 * Safe and non-blocking: catches network/deployment errors so client order flow is never interrupted.
 */
export async function sendOrderConfirmationEmail(
  orderId: string,
  customerEmail?: string
): Promise<SendOrderEmailResult> {
  if (!orderId) {
    return { success: false, error: 'Order ID is required to send confirmation email' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-order-email', {
      body: {
        order_id: orderId,
        customer_email: customerEmail,
      },
    });

    if (error) {
      console.warn('Supabase Edge Function invocation notice (send-order-email):', error.message || error);
      return {
        success: false,
        error: error.message || 'Failed to invoke email confirmation edge function',
      };
    }

    if (data && data.success) {
      console.log('Order confirmation email sent successfully:', data);
      return data as SendOrderEmailResult;
    }

    console.warn('send-order-email response notice:', data);
    return (data as SendOrderEmailResult) || { success: false, error: 'Unknown response from email service' };
  } catch (err: any) {
    console.warn('Unexpected error while triggering order confirmation email:', err);
    return {
      success: false,
      error: err.message || 'Unexpected error while triggering email',
    };
  }
}
