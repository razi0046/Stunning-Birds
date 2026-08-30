import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  Printer, 
  RefreshCw, 
  PackageCheck, 
  Truck, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Order, ShippingLabel } from '../types';
import { ShippingLabelView } from './ShippingLabelView';
import { downloadShippingLabelPDF, generateShippingLabelData } from '../utils/shippingLabelGenerator';
import { formatINR } from '../utils/formatCurrency';

interface Props {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onUpdateLabel?: (orderId: string, updatedLabel: ShippingLabel) => void;
  showToast?: (msg: string) => void;
}

export const ShippingLabelModal: React.FC<Props> = ({
  isOpen,
  order,
  onClose,
  onUpdateLabel,
  showToast
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedAwb, setCopiedAwb] = useState(false);
  const [activeLabel, setActiveLabel] = useState<ShippingLabel | null>(null);

  // Sync label when modal opens or order changes
  React.useEffect(() => {
    if (order) {
      if (order.shippingLabel) {
        setActiveLabel(order.shippingLabel);
      } else {
        // Automatically generate if not already attached
        const generated = generateShippingLabelData(order);
        setActiveLabel(generated);
        if (onUpdateLabel) {
          onUpdateLabel(order.id, generated);
        }
      }
    } else {
      setActiveLabel(null);
    }
  }, [order]);

  if (!isOpen || !order || !activeLabel) return null;

  const handleDownloadPDF = async () => {
    const element = document.getElementById('shipping-label-preview-target');
    if (!element) {
      if (showToast) showToast('Error: Shipping label element not found in DOM');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const filename = `Shipping-Label-${order.id.replace(/[^a-zA-Z0-9-]/g, '')}-${activeLabel.awbNumber}.pdf`;
      await downloadShippingLabelPDF(element, filename);
      setIsGeneratingPdf(false);
      if (showToast) showToast(`Downloaded shipping label PDF for ${order.id}`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      setIsGeneratingPdf(false);
      if (showToast) showToast('Failed to download PDF. Please try the Print option.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRegenerate = () => {
    const refreshed = generateShippingLabelData(order);
    setActiveLabel(refreshed);
    if (onUpdateLabel) {
      onUpdateLabel(order.id, refreshed);
    }
    if (showToast) showToast(`Generated fresh AWB (${refreshed.awbNumber}) for ${order.id}`);
  };

  const handleCopyAwb = () => {
    navigator.clipboard.writeText(activeLabel.awbNumber);
    setCopiedAwb(true);
    setTimeout(() => setCopiedAwb(false), 2000);
    if (showToast) showToast(`Copied AWB ${activeLabel.awbNumber} to clipboard`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-4xl bg-[#fbf9f5] rounded-lg shadow-2xl border border-[#ded5c7] overflow-hidden z-10 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-[#181614] text-white flex justify-between items-center border-b border-[#2e2a25]">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#8c562e] rounded-xs text-white">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37] font-semibold">
                    Air Courier Shipping Manifest
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-white/10 text-gray-200">
                    4x6 Standard
                  </span>
                </div>
                <h3 className="font-serif-luxury text-lg sm:text-xl font-bold text-white tracking-wide">
                  Shipping Label • {order.id}
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-white rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Body: Label Preview on Left/Center, Info Controls on Right/Top */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#f7f4ee]">
            
            {/* Left Column: Interactive Label Canvas */}
            <div className="lg:col-span-7 flex flex-col items-center justify-start bg-white p-3 sm:p-5 rounded-xs border border-[#ded5c7] shadow-inner overflow-x-auto">
              <div className="w-full flex justify-between items-center mb-3 pb-2 border-b border-gray-200 text-xs text-gray-500">
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <FileText className="w-3.5 h-3.5 text-[#8c562e]" />
                  <span>PREVIEW: THERMAL / LASER COURIER LABEL</span>
                </div>
                <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold">
                  Ready to Dispatch
                </span>
              </div>

              {/* Real Rendered Label Frame */}
              <div className="w-full flex justify-center">
                <ShippingLabelView label={activeLabel} containerId="shipping-label-preview-target" />
              </div>
            </div>

            {/* Right Column: Order Intelligence, Manifest Meta & Actions */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Quick Summary Card */}
              <div className="bg-white p-4 rounded-xs border border-[#ded5c7] shadow-2xs space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#8c857d] border-b border-[#f0eae0] pb-2">
                  Consignment Overview
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#78716c]">AWB Tracking No:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[#181614] text-[11px]">{activeLabel.awbNumber}</span>
                      <button
                        onClick={handleCopyAwb}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-black cursor-pointer"
                        title="Copy AWB Number"
                      >
                        {copiedAwb ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#78716c]">Routing Hub:</span>
                    <span className="font-mono font-bold px-1.5 py-0.5 bg-[#f6f2ea] border border-[#ded5c7] text-[#8c562e]">
                      {activeLabel.routingHub} ({activeLabel.sortCode})
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#78716c]">Payment Type:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeLabel.isCod 
                        ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {activeLabel.isCod ? 'CASH ON DELIVERY (COD)' : `PREPAID (${activeLabel.paymentMethod})`}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#78716c]">Total Value:</span>
                    <span className="font-serif-luxury font-bold text-sm text-[#181614]">
                      {formatINR(activeLabel.totalAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#78716c]">Recipient PIN:</span>
                    <span className="font-mono font-bold text-black bg-gray-100 px-1.5 py-0.5 border border-gray-300">
                      {activeLabel.shipTo.pincode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-white p-4 rounded-xs border border-[#ded5c7] shadow-2xs space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#8c857d] mb-1">
                  Label Actions
                </div>

                {/* Download PDF Button */}
                <motion.button
                  id="download-shipping-label-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isGeneratingPdf}
                  onClick={handleDownloadPDF}
                  className="w-full py-3 px-4 bg-[#8c562e] hover:bg-[#734320] text-white font-semibold text-xs uppercase tracking-[0.15em] rounded-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingPdf ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating PDF Document...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Shipping Label (PDF)</span>
                    </>
                  )}
                </motion.button>

                {/* Print Label Button */}
                <motion.button
                  id="print-shipping-label-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePrint}
                  className="w-full py-2.5 px-4 bg-[#181614] hover:bg-[#2d2925] text-white font-semibold text-xs uppercase tracking-[0.15em] rounded-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <Printer className="w-4 h-4 text-[#d4af37]" />
                  <span>Print Label</span>
                </motion.button>

                {/* Regenerate Label */}
                <button
                  onClick={handleRegenerate}
                  className="w-full py-2 px-3 bg-[#fbf9f5] hover:bg-[#f2ece1] text-[#524941] hover:text-[#181614] border border-[#ded5c7] font-semibold text-xs uppercase tracking-wider rounded-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate AWB / Routing</span>
                </button>
              </div>

              {/* Delivery Compliance Note */}
              <div className="p-3 bg-[#f5f0e6] border border-[#e2d6c3] rounded-xs text-[11px] text-[#696159] space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-[#8c562e] uppercase text-[10px] tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Courier Compliance Guaranteed</span>
                </div>
                <p className="leading-relaxed">
                  This label is strictly compliant with Indian standard air cargo shipping guidelines. 
                  Affix the printed 4x6 label onto the top flat surface of the luxury presentation parcel box before courier pickup.
                </p>
              </div>

            </div>

          </div>

          {/* Footer Bar */}
          <div className="p-4 bg-white border-t border-[#ded5c7] flex justify-between items-center">
            <span className="text-xs text-[#78716c]">
              Order created: {order.date} • {order.items.length} unique pieces
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#181614] hover:bg-[#8c562e] text-white text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
