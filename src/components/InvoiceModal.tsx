import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, FileText, CheckCircle2, ShieldCheck, Printer, AlertCircle } from 'lucide-react';
import { Order, Product, UserProfile } from '../types';
import { formatINR } from '../utils/formatCurrency';
import brandFullLogo from '../assets/images/stunning_birds_dark_text_transparent.png';
import { 
  generateAndDownloadInvoicePDF, 
  convertAmountToWords, 
  ATELIER_STORE_CONFIG,
  INDIAN_STATE_GST_CODES,
  verifyOrderOwnership 
} from '../utils/invoicePdfGenerator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  products: Product[];
  currentUser?: UserProfile | null;
  showToast: (msg: string) => void;
}

export const InvoiceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  order,
  products,
  currentUser,
  showToast,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !order) return null;

  // Security check: verify ownership
  const authCheck = verifyOrderOwnership(order, currentUser);
  const isAllowed = authCheck.allowed;

  const rawId = (order.id || '').replace(/[^a-zA-Z0-9-]/g, '');
  const cleanOrderId = (order.id || '').startsWith('#') ? order.id : `#${order.id || ''}`;
  const invoiceNumber = order.shippingLabel?.invoiceNumber || `INV-${rawId}`;
  const orderDateStr = order.date || new Date().toLocaleDateString('en-GB');
  const invoiceDateStr = order.shippingLabel?.invoiceDate || orderDateStr;
  const orderState = order.shippingAddress?.state || '';
  const stateGstCode = INDIAN_STATE_GST_CODES[orderState] || '29';
  const placeOfSupply = `${stateGstCode} ${orderState || 'Maharashtra'}`;

  // Calculations with safe items fallback
  const safeItems = Array.isArray(order.items) ? order.items : [];
  const itemsTaxableSum = safeItems.reduce((acc, it) => acc + ((Number(it.price) || 0) * (Number(it.quantity) || 1)) / 1.18, 0);
  const itemsTaxSum = safeItems.reduce((acc, it) => acc + (((Number(it.price) || 0) * (Number(it.quantity) || 1)) - ((Number(it.price) || 0) * (Number(it.quantity) || 1)) / 1.18), 0);
  const deliveryCharge = Number(order.shipping) || 0;
  const deliveryTaxable = deliveryCharge > 0 ? deliveryCharge / 1.18 : 0;
  const deliveryTax = deliveryCharge > 0 ? deliveryCharge - deliveryTaxable : 0;
  const totalTaxable = itemsTaxableSum + deliveryTaxable;
  const totalTax = itemsTaxSum + deliveryTax;
  const grandTotal = Number(order.total) || (Number(order.subtotal) || 0) + deliveryCharge + totalTax;
  const amountWords = convertAmountToWords(grandTotal);

  const handleDownload = async () => {
    if (!isAllowed) {
      showToast(authCheck.reason || 'Unauthorized order access');
      return;
    }

    try {
      setIsDownloading(true);
      await generateAndDownloadInvoicePDF(order, products, currentUser, ATELIER_STORE_CONFIG);
      showToast(`Downloaded Invoice-${rawId}.pdf successfully`);
    } catch (err: any) {
      console.error('Invoice download error:', err);
      showToast(err.message || 'Failed to generate invoice PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-white text-black shadow-2xl rounded-xs my-8 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Modal Header Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-[#181614] text-white border-b border-[#333] gap-2">
            <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
              <div className="p-1.5 bg-[#8c562e] rounded-xs text-white shrink-0">
                <FileText className="w-4 h-4 sm:w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-serif-luxury font-bold tracking-wide truncate">
                  Tax Invoice — {invoiceNumber}
                </h2>
                <p className="text-[10px] sm:text-[11px] text-[#ded3c2] truncate">
                  Commission Order {order.id} • {orderDateStr}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
              <button
                onClick={handlePrint}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                title="Print Invoice"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              <button
                id="modal-download-invoice-btn"
                onClick={handleDownload}
                disabled={isDownloading || !isAllowed}
                className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-4 py-1.5 bg-[#8c562e] hover:bg-[#734320] text-white text-[11px] sm:text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">{isDownloading ? 'Generating...' : 'Download PDF'}</span>
                <span className="inline xs:hidden sm:hidden">{isDownloading ? 'PDF...' : 'PDF'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xs transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Security Alert if not allowed */}
          {!isAllowed && (
            <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center gap-3 text-amber-900 text-xs">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
              <span>{authCheck.reason}</span>
            </div>
          )}

          {/* Invoice Document Body (Printable & High Fidelity) */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-6 md:p-8 bg-[#f9f9f9]">
            <div 
              id="invoice-printable-document" 
              className="bg-white border-2 border-black p-3.5 sm:p-6 md:p-8 shadow-sm space-y-4 sm:space-y-5 text-black font-sans text-xs leading-relaxed max-w-3xl mx-auto w-full"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
            >
              {/* 1. Header Box */}
              <div className="border-2 border-black p-3 sm:p-4 bg-[#faf8f5] flex flex-col md:flex-row justify-between items-start gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row items-start gap-2.5 sm:gap-4 w-full md:w-auto min-w-0">
                  <div className="shrink-0 flex items-center justify-start bg-transparent self-start">
                    <img 
                      src={brandFullLogo} 
                      alt="Stunning Birds Logo" 
                      className="w-28 sm:w-40 md:w-48 h-auto max-h-12 sm:max-h-16 md:max-h-20 object-contain block"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="font-bold text-xs sm:text-sm md:text-base tracking-tight text-black break-words leading-snug">
                      {ATELIER_STORE_CONFIG.storeName}
                    </h1>
                    <p className="text-[9.5px] sm:text-[10.5px] text-gray-700 font-medium leading-tight mt-0.5">{ATELIER_STORE_CONFIG.tagline}</p>
                    <p className="text-[9px] sm:text-[9.5px] text-gray-800 mt-1 leading-tight">
                      {ATELIER_STORE_CONFIG.addressLine1}, {ATELIER_STORE_CONFIG.addressLine2}
                    </p>
                    <p className="text-[9px] sm:text-[9.5px] text-gray-800 leading-tight">
                      {ATELIER_STORE_CONFIG.city}, {ATELIER_STORE_CONFIG.state} - {ATELIER_STORE_CONFIG.pincode} | Tel: {ATELIER_STORE_CONFIG.phone}
                    </p>
                    <p className="text-[9px] sm:text-[9.5px] text-gray-800 leading-tight break-all sm:break-normal">
                      Email: {ATELIER_STORE_CONFIG.email} | Web: {ATELIER_STORE_CONFIG.website}
                    </p>
                  </div>
                </div>

                <div className="text-left md:text-right space-y-0.5 md:border-l-0 border-t md:border-t-0 pt-2 md:pt-0 w-full md:w-auto border-gray-300 shrink-0 text-[9px] sm:text-[10px]">
                  <div className="font-bold text-[10.5px] sm:text-xs text-[#8c562e]">
                    GSTIN: <span className="font-mono">{ATELIER_STORE_CONFIG.gstin}</span>
                  </div>
                  <div className="text-gray-700">
                    CIN: <span className="font-mono">{ATELIER_STORE_CONFIG.cin}</span>
                  </div>
                  <div className="text-gray-700 font-medium">
                    Place of Dispatch: {ATELIER_STORE_CONFIG.city} (19)
                  </div>
                </div>
              </div>

              {/* 2. Tax Invoice Title & Metadata */}
              <div className="border-2 border-black">
                <div className="bg-black text-white px-4 py-1.5 flex justify-between items-center">
                  <span className="font-bold text-xs uppercase tracking-widest">TAX INVOICE</span>
                  <span className="text-[10px] uppercase font-semibold tracking-wider">Original For Recipient</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-black text-[10px] bg-white">
                  <div className="p-2.5">
                    <span className="text-gray-600 block text-[9px]">Invoice Number</span>
                    <span className="font-mono font-bold text-black">{invoiceNumber}</span>
                  </div>
                  <div className="p-2.5">
                    <span className="text-gray-600 block text-[9px]">Order ID</span>
                    <span className="font-mono font-bold text-black">{cleanOrderId}</span>
                  </div>
                  <div className="p-2.5">
                    <span className="text-gray-600 block text-[9px]">Invoice Date</span>
                    <span className="font-bold text-black">{invoiceDateStr}</span>
                  </div>
                  <div className="p-2.5">
                    <span className="text-gray-600 block text-[9px]">Place of Supply</span>
                    <span className="font-bold text-black">{placeOfSupply}</span>
                  </div>
                </div>
              </div>

              {/* 3. Customer Address Grid: BILL TO & SHIP TO */}
              <div className="border-2 border-black grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x-2 divide-black text-[10px]">
                {/* BILL TO */}
                <div className="flex flex-col">
                  <div className="bg-[#f5f0e8] px-3 py-1 font-bold text-[10.5px] uppercase border-b border-black text-black">
                    BILL TO / BUYER DETAILS
                  </div>
                  <div className="p-3 space-y-1 text-black flex-1">
                    <div className="font-bold text-xs">{order.customer?.name || 'Customer'}</div>
                    {order.shippingAddress?.addressLine && <div>{order.shippingAddress.addressLine}</div>}
                    <div>
                      {[order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(', ')}
                      {order.shippingAddress?.pincode ? ` - ${order.shippingAddress.pincode}` : ''}
                    </div>
                    {order.shippingAddress?.phone && (
                      <div>
                        Phone: <span className="font-mono font-semibold">{order.shippingAddress.phone}</span>
                      </div>
                    )}
                    {order.customer?.email && (
                      <div>
                        Email: <span className="text-gray-800">{order.customer.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* SHIP TO */}
                <div className="flex flex-col">
                  <div className="bg-[#f5f0e8] px-3 py-1 font-bold text-[10.5px] uppercase border-b border-black text-black">
                    SHIP TO / DELIVERY DESTINATION
                  </div>
                  <div className="p-3 space-y-1 text-black flex-1">
                    <div className="font-bold text-xs">{order.customer?.name || 'Customer'}</div>
                    {order.shippingAddress?.addressLine && <div>{order.shippingAddress.addressLine}</div>}
                    {order.shippingAddress?.landmark && (
                      <div className="text-gray-700">Near {order.shippingAddress.landmark}</div>
                    )}
                    <div>
                      {[order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(', ')}
                      {order.shippingAddress?.pincode ? ` - ${order.shippingAddress.pincode}` : ''}
                    </div>
                    {order.shippingAddress?.phone && (
                      <div>
                        Phone: <span className="font-mono font-semibold">{order.shippingAddress.phone}</span>
                      </div>
                    )}
                    <div className="text-gray-700 text-[9.5px]">
                      Shipping Method: <span className="font-semibold text-black">{order.shippingMethod || 'Express Courier'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Product Table */}
              <div className="border-2 border-black overflow-x-auto">
                <table className="w-full text-left text-[9.5px] border-collapse">
                  <thead>
                    <tr className="bg-black text-white font-bold text-[9px] uppercase">
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-2">Product Description & SKU</th>
                      <th className="py-2 px-2 text-center w-14">HSN</th>
                      <th className="py-2 px-2 text-center w-12">Qty</th>
                      <th className="py-2 px-2 text-right w-24">Unit Price</th>
                      <th className="py-2 px-2 text-right w-24">Taxable Value</th>
                      <th className="py-2 px-2 text-right w-24">Taxes (18%)</th>
                      <th className="py-2 px-2 text-right w-24">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {safeItems.map((item, index) => {
                      const prod = products.find(p => p.id === item.productId || p.name === item.productName);
                      const skuCode = item.sku || prod?.sku || prod?.skuId || `SB-LTD-${100 + index}`;
                      const hsn = '4202';
                      const qty = item.quantity || 1;
                      const gross = item.price * qty;
                      const taxable = gross / 1.18;
                      const tax = gross - taxable;

                      return (
                        <tr key={index} className="hover:bg-gray-50 text-black">
                          <td className="py-2 px-2 text-center font-bold">{index + 1}</td>
                          <td className="py-2 px-2">
                            <div className="font-bold text-[10px] text-black">{item.productName}</div>
                            <div className="font-mono text-[9px] text-gray-700">SKU: {skuCode}</div>
                            {(item.colorName || item.monogram) && (
                              <div className="text-[8.5px] text-gray-600 mt-0.5">
                                {item.colorName && `Color: ${item.colorName}`}
                                {item.monogram && ` • Monogram: [${item.monogram}] (${item.foilColor || 'Gold'} Foil)`}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-mono">{hsn}</td>
                          <td className="py-2 px-2 text-center font-bold">{qty}</td>
                          <td className="py-2 px-2 text-right font-mono">
                            {formatINR(item.price)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono">
                            {formatINR(taxable)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-[9px]">
                            <div>IGST 18%</div>
                            <div>{formatINR(tax)}</div>
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-black">
                            {formatINR(gross)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 5. Totals & Payment Summary Box */}
              <div className="border-2 border-black grid grid-cols-1 sm:grid-cols-12 divide-y sm:divide-y-0 sm:divide-x-2 divide-black text-[10px]">
                {/* Left side: Payment details & Amount in words */}
                <div className="sm:col-span-7 p-3 bg-[#faf8f5] flex flex-col justify-between space-y-3">
                  <div>
                    <div className="font-bold text-[10.5px] uppercase text-black mb-1.5">
                      PAYMENT & LOGISTICS DETAILS
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                      <div>
                        <span className="text-gray-600 block">Payment Method:</span>
                        <span className="font-bold text-black">{order.paymentMethod || 'Online Payment'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 block">Payment Status:</span>
                        <span className={`font-bold uppercase ${order.paymentStatus === 'Refunded' ? 'text-purple-700' : order.paymentStatus === 'Paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {order.paymentStatus || 'Paid'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 block">Transaction Ref:</span>
                        <span className="font-mono font-semibold text-black">TXN-{rawId}-8942</span>
                      </div>
                      <div>
                        <span className="text-gray-600 block">Courier Service:</span>
                        <span className="font-semibold text-black">{order.shippingMethod || 'Express Air Courier'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-300">
                    <span className="text-[9px] uppercase font-semibold text-gray-600 block">Amount in Words:</span>
                    <span className="font-bold italic text-black text-[10px]">{amountWords}</span>
                  </div>
                </div>

                {/* Right side: Numerical Breakdown */}
                <div className="sm:col-span-5 flex flex-col justify-between divide-y divide-gray-300 bg-white">
                  <div className="p-3 space-y-1.5 text-[9.5px]">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Taxable Subtotal:</span>
                      <span className="font-mono font-semibold text-black">{formatINR(totalTaxable)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Delivery Charges:</span>
                      <span className="font-mono font-semibold text-black">
                        {deliveryCharge > 0 ? formatINR(deliveryCharge) : 'FREE (Complimentary)'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Total GST (18.0% IGST):</span>
                      <span className="font-mono font-semibold text-black">{formatINR(totalTax)}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-black text-white flex justify-between items-center">
                    <span className="font-bold text-xs uppercase">Grand Total:</span>
                    <span className="font-mono font-black text-sm">{formatINR(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* 6. Footer Disclaimer & Policy */}
              <div className="border border-black p-3 bg-[#faf8f5] text-[8.5px] leading-tight space-y-1 text-gray-800">
                <div className="font-bold uppercase text-black text-[9px]">TERMS & ATELIER WARRANTY:</div>
                <p>
                  1. Tax is not payable on reverse charge basis. 2. Handcrafted leather pieces are covered under Stunning Birds 14-day atelier inspection and craft warranty.
                </p>
                <p>
                  3. For returns, repair care or bespoke assistance, write to {ATELIER_STORE_CONFIG.email} or call {ATELIER_STORE_CONFIG.phone}.
                </p>
                <p className="text-gray-600">
                  4. Registered Office: {ATELIER_STORE_CONFIG.registeredName}, {ATELIER_STORE_CONFIG.addressLine1}, {ATELIER_STORE_CONFIG.city}, {ATELIER_STORE_CONFIG.state} {ATELIER_STORE_CONFIG.pincode}, India.
                </p>
                <div className="pt-1 text-right italic font-semibold text-black">
                  This is a computer-generated invoice and does not require a physical signature.
                </div>
              </div>

            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-[#f6f2ea] border-t border-[#ded5c7] text-xs">
            <span className="text-gray-600 text-center sm:text-left text-[11px] sm:text-xs">
              Generated dynamically from verified order <span className="font-mono font-bold text-black">{order.id}</span>
            </span>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 border border-[#ded5c7] hover:bg-white text-black font-semibold rounded-xs transition-colors cursor-pointer text-center"
              >
                Close
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading || !isAllowed}
                className="flex-1 sm:flex-initial px-4 sm:px-5 py-2 bg-[#8c562e] hover:bg-[#734320] text-white font-semibold uppercase tracking-wider rounded-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer text-xs"
              >
                <Download className="w-4 h-4" />
                <span>{isDownloading ? 'Downloading...' : 'Download Invoice PDF'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
