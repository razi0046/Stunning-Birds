// Supabase Edge Function: send-order-email
// Dispatches a luxury handcrafted order confirmation email via Resend for STUNNING BIRDS.
// Hardened with strict authorization, atomic OCC locks, Resend Idempotency-Key deduplication,
// and consistent database state verification.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';

// 1. Environment variables and secrets
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'STUNNING BIRDS <orders@stunningbirds.in>';
const SITE_URL = (Deno.env.get('SITE_URL') || 'https://stunningbirds.in').replace(/\/+$/, '');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

interface SendOrderEmailPayload {
  order_id: string; // e.g. '#ORD-1092' or 'ORD-1092'
  customer_email?: string; // Required for guest checkout verification
}

// Currency formatter for Indian Rupees (INR)
function formatINR(amount: number): string {
  const rounded = Math.round(amount || 0);
  return '₹' + rounded.toLocaleString('en-IN');
}

// HTML escape helper to prevent injection in generated emails
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generates the responsive, luxury STUNNING BIRDS email HTML
function buildOrderConfirmationEmailHtml(order: any, items: any[]): string {
  const customerName = escapeHtml(order.customer_name || 'Valued Patron');
  const orderId = escapeHtml(order.id);
  const orderDate = escapeHtml(
    order.order_date ||
      new Date(order.created_at || Date.now()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
  );
  const paymentMethod = escapeHtml(order.payment_method || 'Online Payment');
  const paymentStatus = escapeHtml(order.payment_status || 'Paid');
  const fulfillmentStatus = escapeHtml(order.fulfillment_status || 'CRAFTING');

  // Address parsing
  const addr =
    typeof order.shipping_address === 'string'
      ? JSON.parse(order.shipping_address)
      : (order.shipping_address || {});

  const addressLine = escapeHtml(addr.addressLine || '');
  const landmark = escapeHtml(addr.landmark || '');
  const city = escapeHtml(addr.city || '');
  const state = escapeHtml(addr.state || '');
  const pincode = escapeHtml(addr.pincode || '');
  const phone = escapeHtml(addr.phone || '');

  // Pricing calculations
  const subtotal = Number(order.subtotal) || 0;
  const shipping = Number(order.shipping) || 0;
  const taxes = Number(order.taxes) || 0;
  const total = Number(order.total) || 0;

  // Derive discount if present
  const shippingLabel =
    typeof order.shipping_label === 'object' && order.shipping_label !== null
      ? order.shipping_label
      : {};
  const explicitDiscount = Number(shippingLabel.discountAmount || 0);
  const calculatedDiscount = Math.max(0, (subtotal + shipping + taxes) - total);
  const discountAmount = explicitDiscount > 0 ? explicitDiscount : calculatedDiscount;
  const couponCode = escapeHtml(shippingLabel.couponCode || '');

  // Construct item rows
  const itemRowsHtml = (items || [])
    .map((item: any) => {
      const itemName = escapeHtml(item.product_name || 'Handcrafted Atelier Piece');
      const color = escapeHtml(item.color_name || '');
      const monogram = item.monogram ? escapeHtml(item.monogram) : '';
      const foil = item.foil_color ? escapeHtml(item.foil_color) : '';
      const qty = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;
      const lineTotal = price * qty;
      const imageUrl =
        item.product_image && !item.product_image.startsWith('data:')
          ? item.product_image
          : '';

      return `
      <tr>
        <td style="padding: 16px 12px; border-bottom: 1px solid #e8e2d8; vertical-align: middle;">
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
            <tr>
              ${
                imageUrl
                  ? `
              <td style="width: 64px; vertical-align: top; padding-right: 14px;">
                <img src="${escapeHtml(imageUrl)}" alt="${itemName}" width="64" height="64" style="width: 64px; height: 64px; object-fit: cover; border-radius: 4px; border: 1px solid #e8e2d8; display: block;" />
              </td>
              `
                  : ''
              }
              <td style="vertical-align: middle;">
                <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-weight: 600; color: #181614; line-height: 1.3;">
                  ${itemName}
                </div>
                ${
                  color
                    ? `
                <div style="font-size: 12px; color: #78716c; margin-top: 4px; font-weight: 500;">
                  Leather: <span style="color: #292524;">${color}</span>
                </div>`
                    : ''
                }
                ${
                  monogram
                    ? `
                <div style="font-size: 11px; color: #927238; margin-top: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  Personalisation: ${monogram} ${foil ? `(${foil} Foil)` : ''}
                </div>`
                    : ''
                }
                <div style="font-size: 12px; color: #a8a29e; margin-top: 2px;">
                  Qty: ${qty} &times; ${formatINR(price)}
                </div>
              </td>
            </tr>
          </table>
        </td>
        <td style="padding: 16px 12px; border-bottom: 1px solid #e8e2d8; text-align: right; vertical-align: middle; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 14px; font-weight: 600; color: #181614; white-space: nowrap;">
          ${formatINR(lineTotal)}
        </td>
      </tr>
    `;
    })
    .join('');

  const orderTrackingUrl = `${SITE_URL}?screen=account&orderId=${encodeURIComponent(order.id)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - ${orderId} | STUNNING BIRDS</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f4ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #181614;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f4ef; width: 100%; margin: 0; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e7dfd3; box-shadow: 0 4px 20px rgba(24, 22, 20, 0.04);">
          
          <!-- ATELIER BRAND HEADER -->
          <tr>
            <td style="background-color: #181614; padding: 36px 32px; text-align: center; border-bottom: 2px solid #c5a880;">
              <div style="color: #c5a880; font-size: 11px; font-weight: 700; letter-spacing: 3.5px; text-transform: uppercase; margin-bottom: 6px;">
                Heritage Leather Atelier
              </div>
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 26px; font-weight: 700; color: #faf8f5; letter-spacing: 2px; text-transform: uppercase; margin: 0;">
                STUNNING BIRDS
              </div>
              <div style="color: #a8a29e; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 6px;">
                Bengaluru &bull; Handcrafted Perfection
              </div>
            </td>
          </tr>

          <!-- ORDER CONFIRMED BANNER -->
          <tr>
            <td style="padding: 32px 32px 20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; margin-bottom: 12px;">
                      Commission Confirmed
                    </span>
                    <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; color: #181614; margin: 0 0 8px 0; font-weight: 600; line-height: 1.3;">
                      Thank you for your commission, ${customerName}.
                    </h1>
                    <p style="font-size: 14px; line-height: 1.6; color: #57534e; margin: 0;">
                      We have received your order and our master artisans have initiated crafting your bespoke leather commission. Below is your formal receipt and commission summary.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ORDER METADATA CARD -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #faf8f5; border: 1px solid #e8e2d8; border-radius: 6px; padding: 18px 20px;">
                <tr>
                  <td width="50%" style="vertical-align: top; padding-bottom: 12px;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #8c827a; font-weight: 600; margin-bottom: 4px;">Commission ID</div>
                    <div style="font-family: 'JetBrains Mono', Consolas, monospace; font-size: 15px; font-weight: 700; color: #181614;">${orderId}</div>
                  </td>
                  <td width="50%" style="vertical-align: top; padding-bottom: 12px;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #8c827a; font-weight: 600; margin-bottom: 4px;">Order Date</div>
                    <div style="font-size: 14px; font-weight: 600; color: #181614;">${orderDate}</div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="vertical-align: top;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #8c827a; font-weight: 600; margin-bottom: 4px;">Payment Method</div>
                    <div style="font-size: 14px; font-weight: 600; color: #181614;">${paymentMethod}</div>
                    <div style="font-size: 12px; color: #15803d; font-weight: 600; margin-top: 2px;">&bull; ${paymentStatus}</div>
                  </td>
                  <td width="50%" style="vertical-align: top;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #8c827a; font-weight: 600; margin-bottom: 4px;">Atelier Status</div>
                    <div style="font-size: 14px; font-weight: 600; color: #181614;">${fulfillmentStatus}</div>
                    <div style="font-size: 12px; color: #78716c; margin-top: 2px;">Cutting &amp; Stitching</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ORDER ITEMS TABLE -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #181614; margin-bottom: 12px;">
                Bespoke Line Items
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #faf8f5;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #78716c; font-weight: 600; border-bottom: 2px solid #e8e2d8;">Item Description</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #78716c; font-weight: 600; border-bottom: 2px solid #e8e2d8;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRowsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- FINANCIAL TOTALS -->
          <tr>
            <td style="padding: 16px 32px 28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #57534e;">Subtotal</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #181614; text-align: right; font-family: 'JetBrains Mono', Consolas, monospace; font-weight: 500;">${formatINR(subtotal)}</td>
                </tr>
                ${
                  discountAmount > 0
                    ? `
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #b45309; font-weight: 500;">
                    Atelier Privilege Discount ${couponCode ? `<span style="font-size: 12px; color: #927238;">(${couponCode})</span>` : ''}
                  </td>
                  <td style="padding: 6px 0; font-size: 14px; color: #b45309; text-align: right; font-family: 'JetBrains Mono', Consolas, monospace; font-weight: 600;">
                    -${formatINR(discountAmount)}
                  </td>
                </tr>
                `
                    : ''
                }
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #57534e;">Shipping (Complimentary Express Courier)</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #15803d; text-align: right; font-weight: 600;">${shipping > 0 ? formatINR(shipping) : 'FREE'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #78716c;">Estimated Goods &amp; Services Tax (18% GST incl.)</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #78716c; text-align: right; font-family: 'JetBrains Mono', Consolas, monospace;">${formatINR(taxes)}</td>
                </tr>
                <tr>
                  <td style="padding: 16px 0 0 0; font-size: 16px; font-weight: 700; color: #181614; border-top: 2px solid #181614;">Total Investment</td>
                  <td style="padding: 16px 0 0 0; font-size: 20px; font-weight: 700; color: #181614; text-align: right; font-family: 'JetBrains Mono', Consolas, monospace; border-top: 2px solid #181614;">${formatINR(total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SHIPPING DESTINATION & ACTION BUTTON -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #faf8f5; border: 1px solid #e8e2d8; border-radius: 6px; padding: 20px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #8c827a; font-weight: 700; margin-bottom: 6px;">
                      Delivery Destination
                    </div>
                    <div style="font-size: 14px; font-weight: 700; color: #181614; margin-bottom: 4px;">
                      ${customerName}
                    </div>
                    <div style="font-size: 13px; color: #44403c; line-height: 1.5;">
                      ${addressLine}${landmark ? `, ${landmark}` : ''}<br />
                      ${city}, ${state} &ndash; ${pincode}<br />
                      ${phone ? `Contact: +91 ${phone}` : ''}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- VIEW ORDER CTA BUTTON -->
              <div style="text-align: center; margin-top: 28px;">
                <a href="${orderTrackingUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #181614; color: #f5f1eb; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; padding: 14px 28px; text-decoration: none; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                  View Commission Status &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- ATELIER GUARANTEE & FOOTER -->
          <tr>
            <td style="background-color: #faf8f5; border-top: 1px solid #e8e2d8; padding: 28px 32px; text-align: center;">
              <div style="font-size: 12px; font-weight: 600; color: #181614; margin-bottom: 6px;">
                The Stunning Birds Atelier Guarantee
              </div>
              <div style="font-size: 12px; color: #78716c; line-height: 1.6; max-width: 480px; margin: 0 auto 16px auto;">
                Every piece is cut from certified top-grain leather and saddle-stitched by skilled artisans. We provide complimentary lifetime edge re-conditioning and repair services.
              </div>
              <div style="font-size: 11px; color: #a8a29e; line-height: 1.5;">
                Need assistance with your commission? Reach out to your personal atelier concierge at <a href="mailto:concierge@stunningbirds.in" style="color: #927238; text-decoration: none; font-weight: 600;">concierge@stunningbirds.in</a> or +91 98450 12345.
              </div>
              <div style="font-size: 10px; color: #a8a29e; margin-top: 16px; letter-spacing: 1px; text-transform: uppercase;">
                &copy; ${new Date().getFullYear()} STUNNING BIRDS Atelier. All Rights Reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Enforce POST Method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Parse and validate JSON request payload
    let body: SendOrderEmailPayload;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON request payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order_id, customer_email } = body;
    if (!order_id || typeof order_id !== 'string' || !order_id.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Mandatory field "order_id" is missing or invalid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedOrderId = order_id.trim();
    const cleanId = trimmedOrderId.replace(/^#/, '');
    const targetIds = Array.from(new Set([trimmedOrderId, cleanId, `#${cleanId}`]));

    // 4. Validate Environment Secrets
    if (!RESEND_API_KEY) {
      console.error('send-order-email error: RESEND_API_KEY secret is not configured.');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email service configuration error: RESEND_API_KEY is not configured in Supabase secrets.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('send-order-email error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database configuration error: Missing Supabase credentials in Edge Function environment.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Initialize Supabase Admin Client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // 6. Security & Caller Verification (Preventing Token/Role Spoofing)
    const authHeader = req.headers.get('Authorization') || '';
    let authenticatedUser: any = null;

    if (authHeader.startsWith('Bearer ') && SUPABASE_ANON_KEY) {
      try {
        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false },
        });
        const { data: userData } = await userClient.auth.getUser();
        if (userData?.user) {
          authenticatedUser = userData.user;
        }
      } catch (authErr) {
        console.warn('Could not extract caller from Authorization token:', authErr);
      }
    }

    // 7. Fetch Order and Line Items from public.orders and public.order_items
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        user_id,
        customer_name,
        customer_email,
        customer_avatar,
        order_date,
        subtotal,
        shipping,
        taxes,
        total,
        payment_method,
        payment_status,
        fulfillment_status,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        shipping_address,
        shipping_method,
        timeline,
        shipping_label,
        created_at,
        updated_at,
        order_items (
          id,
          order_id,
          product_id,
          product_name,
          product_image,
          sku,
          color_name,
          price,
          quantity,
          monogram,
          foil_color
        )
      `)
      .in('id', targetIds)
      .maybeSingle();

    if (orderErr) {
      console.error('Database query error looking up order:', orderErr);
      return new Response(
        JSON.stringify({ success: false, error: 'Database query failed while retrieving order details.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!order) {
      return new Response(
        JSON.stringify({ success: false, error: `Order ${trimmedOrderId} was not found in the database.` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Strict Authorization & Ownership Enforcement
    if (authenticatedUser) {
      // Admin verification: Trust ONLY app_metadata or verified public.profiles.is_admin
      // (NEVER trust user_metadata as it can be modified by end-users)
      let isVerifiedAdmin =
        authenticatedUser.app_metadata?.role === 'admin' ||
        authenticatedUser.app_metadata?.is_admin === true;

      if (!isVerifiedAdmin) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('is_admin')
          .eq('id', authenticatedUser.id)
          .maybeSingle();
        if (profile?.is_admin === true) {
          isVerifiedAdmin = true;
        }
      }

      const isOrderOwner =
        (order.user_id && order.user_id === authenticatedUser.id) ||
        (order.customer_email &&
          order.customer_email.trim().toLowerCase() === (authenticatedUser.email || '').trim().toLowerCase());

      if (!isVerifiedAdmin && !isOrderOwner) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Forbidden: You do not have permission to trigger confirmation emails for this order.',
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Unauthenticated caller (Guest checkout)
      // If the order has an associated user_id, require the registered customer to log in.
      if (order.user_id) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unauthorized: This order belongs to a registered customer account. Please log in to trigger confirmation email.',
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // For guest checkout orders: customer_email is strictly REQUIRED and must match the order's customer_email
      if (!customer_email || typeof customer_email !== 'string' || !customer_email.trim()) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Forbidden: Customer email verification is required for guest checkout orders.',
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (customer_email.trim().toLowerCase() !== (order.customer_email || '').trim().toLowerCase()) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Forbidden: Provided customer email does not match the order record.',
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 9. Payment Status Validation (Database Verified - Never Trust Frontend Claims)
    const fulfillmentStatus = (order.fulfillment_status || '').toUpperCase();
    const paymentStatus = (order.payment_status || '').toLowerCase();
    const paymentMethod = (order.payment_method || '').toLowerCase();

    if (fulfillmentStatus === 'CANCELLED') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Order has been cancelled. Confirmation email will not be sent.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (paymentStatus === 'failed') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Order payment has failed. Confirmation email will not be sent.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isCodOrder = paymentMethod.includes('cash on delivery') || paymentMethod.includes('cod');

    if (!isCodOrder) {
      // For online payment methods (Razorpay, UPI, NetBanking), payment must be strictly verified as Paid in Supabase
      if (paymentStatus !== 'paid') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Online order payment is unverified or pending. Confirmation email can only be sent for paid orders.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 10. Duplicate Email Protection / Idempotency Check
    const timelineList = Array.isArray(order.timeline) ? order.timeline : [];
    const shippingLabel =
      typeof order.shipping_label === 'object' && order.shipping_label !== null
        ? order.shipping_label
        : {};

    const alreadySentTimeline = timelineList.some(
      (step: any) => step.key === 'confirmation_email_sent' || step.key === 'order_confirmation_email'
    );
    const alreadySentLabel = shippingLabel.confirmation_email_sent === true;
    const alreadySentCol = (order as any).confirmation_email_sent === true;

    if (alreadySentTimeline || alreadySentLabel || alreadySentCol) {
      return new Response(
        JSON.stringify({
          success: true,
          alreadySent: true,
          message: 'Order confirmation email has already been sent for this order.',
          orderId: order.id,
          recipient: order.customer_email,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 11. Atomic Concurrency Guard (Optimistic Concurrency Control / Dispatch Lock)
    // Check if an in-flight dispatch lock exists and is actively running (under 45 seconds)
    const existingLock = shippingLabel.email_dispatch_lock;
    if (existingLock && existingLock.locked_at) {
      const lockAgeMs = Date.now() - new Date(existingLock.locked_at).getTime();
      if (lockAgeMs < 45000) {
        return new Response(
          JSON.stringify({
            success: true,
            inFlight: true,
            message: 'Order confirmation email dispatch is already in progress for this order.',
            orderId: order.id,
            recipient: order.customer_email,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Acquire atomic dispatch lock on the order
    const lockToken = crypto.randomUUID();
    const lockTimestamp = new Date().toISOString();
    const lockedShippingLabel = {
      ...shippingLabel,
      email_dispatch_lock: {
        token: lockToken,
        locked_at: lockTimestamp,
      },
    };

    let lockQuery = supabaseAdmin
      .from('orders')
      .update({
        shipping_label: lockedShippingLabel,
        updated_at: lockTimestamp,
      })
      .eq('id', order.id);

    if (order.updated_at) {
      lockQuery = lockQuery.eq('updated_at', order.updated_at);
    }

    const { data: claimedRow, error: claimError } = await lockQuery
      .select('id, shipping_label, timeline')
      .maybeSingle();

    if (claimError || !claimedRow) {
      // Another concurrent request updated the order simultaneously.
      // Re-verify the current database state to check if it's in progress or sent.
      const { data: recheckedOrder } = await supabaseAdmin
        .from('orders')
        .select('id, timeline, shipping_label')
        .eq('id', order.id)
        .maybeSingle();

      const recheckedTimeline = Array.isArray(recheckedOrder?.timeline) ? recheckedOrder.timeline : [];
      const recheckedLabel =
        typeof recheckedOrder?.shipping_label === 'object' && recheckedOrder.shipping_label !== null
          ? recheckedOrder.shipping_label
          : {};

      const isSent =
        recheckedLabel.confirmation_email_sent === true ||
        recheckedTimeline.some((s: any) => s.key === 'confirmation_email_sent');

      const isLocked =
        recheckedLabel.email_dispatch_lock &&
        Date.now() - new Date(recheckedLabel.email_dispatch_lock.locked_at).getTime() < 45000;

      if (isSent || isLocked) {
        return new Response(
          JSON.stringify({
            success: true,
            inFlight: !isSent,
            alreadySent: isSent,
            message: isSent
              ? 'Order confirmation email has already been sent for this order.'
              : 'Order confirmation email dispatch is already being processed by another concurrent request.',
            orderId: order.id,
            recipient: order.customer_email,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 12. Generate HTML Email Content
    const emailHtml = buildOrderConfirmationEmailHtml(order, order.order_items || []);

    // 13. Dispatch via Resend API with Provider-Level Idempotency-Key
    // Resend natively dedupes requests with the same Idempotency-Key for 24 hours.
    const resendPayload = {
      from: RESEND_FROM_EMAIL,
      to: [order.customer_email],
      subject: `Order Confirmed: ${order.id} | STUNNING BIRDS Atelier`,
      html: emailHtml,
    };

    const idempotencyKey = `order-confirmation/${cleanId}`;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(resendPayload),
    });

    if (!resendResponse.ok) {
      // Clear the in-flight lock so retries are immediately permitted
      await supabaseAdmin
        .from('orders')
        .update({
          shipping_label: { ...shippingLabel, email_dispatch_lock: null },
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      const errorBody = await resendResponse.json().catch(() => ({}));
      console.error('Resend API error:', resendResponse.status, errorBody);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            errorBody.message ||
            'Resend email delivery failed. Please check your verified sender domain or API key.',
        }),
        { status: resendResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendData = await resendResponse.json();

    // 14. Persist Database State with Retry Logic (Ensuring Resend & DB Consistency)
    const updatedTimeline = [...timelineList];
    if (!updatedTimeline.some((step: any) => step.key === 'confirmation_email_sent')) {
      updatedTimeline.push({
        key: 'confirmation_email_sent',
        title: 'ORDER CONFIRMATION SENT',
        subtitle: `Dispatched via Resend to ${order.customer_email}`,
        completed: true,
        timestamp: new Date().toISOString(),
        resend_id: resendData.id,
      });
    }

    const updatedShippingLabel = {
      ...shippingLabel,
      confirmation_email_sent: true,
      confirmation_email_sent_at: new Date().toISOString(),
      resend_email_id: resendData.id,
      email_dispatch_lock: null, // Lock cleared upon successful completion
    };

    let dbUpdateSuccess = false;
    let lastDbError: any = null;

    // Retry up to 3 times with progressive backoff if transient DB issues occur
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          timeline: updatedTimeline,
          shipping_label: updatedShippingLabel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (!updateError) {
        dbUpdateSuccess = true;
        break;
      }

      lastDbError = updateError;
      console.error(`Attempt ${attempt}: Failed to record email idempotency log:`, updateError);
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }

    if (!dbUpdateSuccess) {
      console.error(
        'Critical consistency warning: Resend accepted email but database state could not be persisted after 3 attempts:',
        lastDbError
      );
      return new Response(
        JSON.stringify({
          success: false,
          emailDispatched: true,
          emailId: resendData.id,
          error:
            'Order confirmation email was dispatched, but database status could not be saved. Please retry later (duplicate email will be prevented).',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 15. Return Verified JSON Success Response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order confirmation email successfully dispatched.',
        orderId: order.id,
        recipient: order.customer_email,
        emailId: resendData.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in send-order-email function:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected internal error occurred while processing the order confirmation email.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
