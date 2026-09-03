import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  Mail,
  Video,
  CheckCircle2,
  MapPin,
  Clock,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { Order, OrderItem, ReturnReason, ReturnRequest } from '../types';
import { supabase } from '../supabaseClient';

interface ReturnRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  item?: OrderItem;
  existingReturn?: ReturnRequest;
  authToken?: string;
  onReturnCreated: (returnReq: ReturnRequest) => void;
}

const REASON_OPTIONS: { value: ReturnReason; label: string; desc: string }[] = [
  {
    value: 'WRONG_PRODUCT',
    label: 'Wrong Product Delivered',
    desc: 'The item received is different from what was ordered in style, color, or specification.',
  },
  {
    value: 'DEFECTIVE_PRODUCT',
    label: 'Defective / Damaged Leather',
    desc: 'Structural stitching failure, severe tear, damaged hardware, or leather flaw upon unboxing.',
  },
  {
    value: 'MISSING_PRODUCT_PART',
    label: 'Missing Component / Accessory',
    desc: 'An included strap, dust bag, brass attachment, or insert was missing from the parcel.',
  },
];

export const ReturnRequestModal: React.FC<ReturnRequestModalProps> = ({
  isOpen,
  onClose,
  order,
  item,
  existingReturn,
  authToken,
  onReturnCreated,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReturnReason>('WRONG_PRODUCT');
  const [description, setDescription] = useState('');
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<ReturnRequest | null>(null);

  if (!isOpen) return null;

  // Selected item fallback to first order item
  const targetItem = item || (order.items && order.items.length > 0 ? order.items[0] : null);
  const itemName = targetItem?.name || targetItem?.productName || 'Handcrafted Leather Piece';
  const itemImg = targetItem?.image || targetItem?.productImage || 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80';
  const itemPrice = targetItem?.price || order.total || 0;
  const itemQty = targetItem?.quantity || 1;

  // 7-day calculation
  let deliveryDateStr = order.date;
  const deliveredStep = order.timeline?.find(s => s.key === 'delivered' || s.title?.toUpperCase().includes('DELIVERED'));
  if (deliveredStep?.date) {
    deliveryDateStr = deliveredStep.date;
  }
  const deliveryDate = new Date(deliveryDateStr);
  const deadlineDate = new Date((isNaN(deliveryDate.getTime()) ? Date.now() : deliveryDate.getTime()) + 7 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.max(0, Math.ceil((deadlineDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (description.trim().length < 10) {
      setError('Please provide a detailed description (at least 10 characters) explaining the issue.');
      return;
    }

    if (!emailConfirmed) {
      setError('You must confirm that you have emailed or will email your unboxing video.');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = authToken || session?.access_token || '';

      if (!token) {
        setError('Authentication required. Please ensure you are logged into your account.');
        setLoading(false);
        return;
      }

      const payload = {
        orderId: order.id,
        orderItemId: targetItem?.id,
        productId: targetItem?.productId || targetItem?.id,
        reason: selectedReason,
        description: description.trim(),
        evidenceEmailConfirmed: true,
      };

      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}: ${res.statusText || 'Internal Server Error'}`);
        }
        throw new Error('Unexpected response format from server.');
      }

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to submit return request. Please try again.');
        setLoading(false);
        return;
      }

      setSuccessData(data.returnRequest);
      onReturnCreated(data.returnRequest);
    } catch (err: any) {
      setError(err?.message || 'A network error occurred. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        id="return-request-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
      >
        <motion.div
          id="return-request-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white border border-[#e5dfd8] rounded-xl shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="bg-[#121212] text-white px-6 py-5 flex items-center justify-between border-b border-[#2a2a2a]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-[#c29d59]/20 flex items-center justify-center text-[#c29d59]">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-white font-medium">Request Return & Refund</h3>
                <p className="text-xs text-neutral-400">Order #{order.id.replace(/^#/, '')} • 7-Day Hassle-Free Policy</p>
              </div>
            </div>
            <button
              id="return-modal-close-btn"
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {successData ? (
            /* Success View */
            <div className="p-8 space-y-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-serif text-xl text-neutral-900 font-semibold">
                  Return Request Submitted Successfully
                </h4>
                <p className="text-sm text-neutral-600 max-w-md mx-auto">
                  Your return reference ID is{' '}
                  <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">
                    {successData.returnRequestId}
                  </span>
                  . Our Atelier team in Kolkata will review your request.
                </p>
              </div>

              {/* Instructions Callout */}
              <div className="bg-[#fcfaf7] border border-[#e5dfd8] rounded-lg p-5 space-y-3">
                <div className="flex items-center space-x-2 text-[#8c6d37] font-semibold text-sm">
                  <Video className="w-4 h-4" />
                  <span>Mandatory Unboxing Video Requirement</span>
                </div>
                <p className="text-xs text-neutral-700 leading-relaxed">
                  To ensure quality compliance and prevent transit disputes, please email your unboxing video to:
                </p>
                <div className="bg-white border border-[#e5dfd8] rounded p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm font-medium text-neutral-900">
                    <Mail className="w-4 h-4 text-[#c29d59]" />
                    <span className="font-mono">stunningbirds236@gmail.com</span>
                  </div>
                  <span className="text-[11px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">
                    Subject: Return {successData.returnRequestId} - #{order.id.replace(/^#/, '')}
                  </span>
                </div>
                <div className="flex items-start space-x-2 text-[11px] text-neutral-500 pt-1">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 text-neutral-400 shrink-0" />
                  <span>
                    Atelier Address: 6E/1B, Topsia 2nd Lane Kolkata-700039, West Bengal India
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  id="return-success-close-btn"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-[#121212] text-white hover:bg-neutral-800 text-sm font-medium rounded-lg transition-colors"
                >
                  View My Returns
                </button>
              </div>
            </div>
          ) : (
            /* Return Form */
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Product Info Card */}
              <div className="flex items-center space-x-4 p-4 bg-[#fbf9f6] border border-[#e5dfd8] rounded-lg">
                <img
                  src={itemImg}
                  alt={itemName}
                  className="w-16 h-16 object-cover rounded-md border border-[#e5dfd8] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-neutral-900 truncate">{itemName}</h4>
                    <span className="font-serif font-medium text-sm text-neutral-900">
                      ₹{(itemPrice * itemQty).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Qty: {itemQty} • Ordered on {new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <div className="flex items-center space-x-1.5 mt-1.5 text-[11px] text-emerald-700 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>Return window open ({daysLeft} days remaining)</span>
                  </div>
                </div>
              </div>

              {existingReturn && (
                <div className="p-4 bg-[#fcfaf7] border border-[#d4af37]/60 text-[#8c562e] rounded-lg text-xs flex items-center space-x-2.5">
                  <RotateCcw className="w-4 h-4 text-[#8c562e] shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Return requested for this product.</p>
                    <p className="text-[11px] text-neutral-600 mt-0.5">
                      Request ID: <span className="font-mono font-bold text-neutral-900">{existingReturn.returnRequestId}</span> (Status: {existingReturn.status.replace(/_/g, ' ')})
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Reason Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Select Return Reason <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  {REASON_OPTIONS.map(option => (
                    <label
                      key={option.value}
                      className={`flex items-start space-x-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                        selectedReason === option.value
                          ? 'border-[#c29d59] bg-[#fcfaf7] shadow-sm'
                          : 'border-[#e5dfd8] hover:border-neutral-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="returnReason"
                        value={option.value}
                        checked={selectedReason === option.value}
                        onChange={() => setSelectedReason(option.value)}
                        className="mt-0.5 text-[#c29d59] focus:ring-[#c29d59]"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-neutral-900">{option.label}</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">{option.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Description Textarea */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Detailed Explanation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="return-description-input"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Please describe the issue in detail (e.g. specific flaw, color discrepancy, missing buckle)..."
                  rows={3}
                  className="w-full text-xs p-3 border border-[#e5dfd8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c29d59] focus:border-[#c29d59] transition-colors"
                />
                <div className="flex justify-between text-[10px] text-neutral-400">
                  <span>Minimum 10 characters required</span>
                  <span>{description.length} characters</span>
                </div>
              </div>

              {/* Unboxing Video Email Policy Notice */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2.5">
                <div className="flex items-center space-x-2 text-amber-900 font-semibold text-xs">
                  <Video className="w-4 h-4 text-amber-700" />
                  <span>Unboxing Video Requirement & Protocol</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  As our leather items are handcrafted and custom-finished, STUNNING BIRDS requires unboxing video evidence to process returns. Please email your unboxing video to <strong className="font-mono">stunningbirds236@gmail.com</strong> with your Order ID. No files are uploaded to this website.
                </p>
                <label className="flex items-start space-x-2.5 pt-1 cursor-pointer">
                  <input
                    id="return-video-confirm-checkbox"
                    type="checkbox"
                    checked={emailConfirmed}
                    onChange={e => setEmailConfirmed(e.target.checked)}
                    className="mt-0.5 rounded text-[#c29d59] focus:ring-[#c29d59]"
                  />
                  <span className="text-xs text-neutral-900 font-medium">
                    I confirm that I have recorded and will send / have sent the complete unboxing video to <span className="underline">stunningbirds236@gmail.com</span>.
                  </span>
                </label>
              </div>

              {/* Footer / Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[#e5dfd8]">
                <div className="flex items-center space-x-1.5 text-[11px] text-neutral-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#c29d59]" />
                  <span>Reverse pickup arranged post approval</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="px-4 py-2 border border-[#e5dfd8] hover:bg-neutral-50 text-neutral-700 text-xs font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-return-request-btn"
                    type="submit"
                    disabled={loading || Boolean(existingReturn) || !emailConfirmed || description.trim().length < 10}
                    className="px-6 py-2 bg-[#121212] hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Submit Return Request</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
