import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RotateCcw,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Mail,
  ChevronDown,
  ChevronUp,
  MapPin,
  ExternalLink,
  ShieldAlert,
  Search,
  RefreshCw,
} from 'lucide-react';
import { ReturnRequest, ReturnStatus, ReturnReason } from '../types';
import { supabase } from '../supabaseClient';

interface CustomerReturnsListProps {
  authToken?: string;
  onNavigateToOrders?: () => void;
}

const REASON_LABELS: Record<ReturnReason, string> = {
  WRONG_PRODUCT: 'Wrong Product Delivered',
  DEFECTIVE_PRODUCT: 'Defective / Damaged Leather',
  MISSING_PRODUCT_PART: 'Missing Component / Accessory',
};

const STATUS_CONFIG: Record<ReturnStatus, { label: string; color: string; badgeBg: string }> = {
  RETURN_REQUESTED: { label: 'Return Requested', color: 'text-amber-700', badgeBg: 'bg-amber-50 border-amber-200' },
  RETURN_APPROVED: { label: 'Approved for Return', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  RETURN_REJECTED: { label: 'Return Declined', color: 'text-rose-700', badgeBg: 'bg-rose-50 border-rose-200' },
  PICKUP_SCHEDULED: { label: 'Pickup Scheduled', color: 'text-indigo-700', badgeBg: 'bg-indigo-50 border-indigo-200' },
  PICKED_UP: { label: 'Picked Up by Courier', color: 'text-indigo-800', badgeBg: 'bg-indigo-100 border-indigo-300' },
  IN_TRANSIT: { label: 'In Transit to Kolkata Atelier', color: 'text-purple-700', badgeBg: 'bg-purple-50 border-purple-200' },
  RETURN_RECEIVED: { label: 'Received at Atelier', color: 'text-teal-700', badgeBg: 'bg-teal-50 border-teal-200' },
  INSPECTION_COMPLETED: { label: 'Inspection Passed', color: 'text-emerald-700', badgeBg: 'bg-emerald-50 border-emerald-200' },
  REFUND_INITIATED: { label: 'Refund Processing', color: 'text-emerald-800', badgeBg: 'bg-emerald-100 border-emerald-300' },
  REFUNDED: { label: 'Refund Completed', color: 'text-emerald-900', badgeBg: 'bg-emerald-200 border-emerald-400' },
  RETURN_COMPLETED: { label: 'Return & Refund Completed', color: 'text-emerald-900', badgeBg: 'bg-emerald-100 border-emerald-300' },
};

const STEPS = [
  { key: 'REQUESTED', label: 'Requested' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'PICKUP', label: 'Pickup / Transit' },
  { key: 'RECEIVED', label: 'Atelier Received' },
  { key: 'INSPECTED', label: 'Inspected' },
  { key: 'REFUNDED', label: 'Refunded' },
];

const getStepProgress = (status: ReturnStatus): number => {
  switch (status) {
    case 'RETURN_REQUESTED': return 1;
    case 'RETURN_APPROVED': return 2;
    case 'PICKUP_SCHEDULED':
    case 'PICKED_UP':
    case 'IN_TRANSIT': return 3;
    case 'RETURN_RECEIVED': return 4;
    case 'INSPECTION_COMPLETED':
    case 'REFUND_INITIATED': return 5;
    case 'REFUNDED':
    case 'RETURN_COMPLETED': return 6;
    case 'RETURN_REJECTED': return 0;
    default: return 1;
  }
};

export const CustomerReturnsList: React.FC<CustomerReturnsListProps> = ({
  authToken,
  onNavigateToOrders,
}) => {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReturns = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = authToken || session?.access_token || '';

      if (!token) {
        setReturns([]);
        setLoading(false);
        return;
      }

      const res = await fetch('/api/returns', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
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
        throw new Error(data.error || 'Failed to load return requests');
      }
      setReturns(data.returns || []);
    } catch (err: any) {
      console.error('Error fetching returns:', err);
      setError(err?.message || 'Unable to retrieve your return requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [authToken]);

  const filteredReturns = returns.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.returnRequestId.toLowerCase().includes(q) ||
      r.orderId.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q)
    );
  });

  return (
    <div id="customer-returns-container" className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e5dfd8]">
        <div>
          <h2 className="font-serif text-xl text-neutral-900 font-medium">My Returns & Refunds</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Track reverse pickups, Atelier inspection status, and refund transactions.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search Return ID or Order..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#e5dfd8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c29d59]"
            />
          </div>
          <button
            onClick={fetchReturns}
            title="Refresh returns"
            className="p-2 border border-[#e5dfd8] hover:bg-neutral-50 rounded-lg text-neutral-600 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#c29d59] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-neutral-500">Loading your return records...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-xs text-rose-800">{error}</p>
          <button
            onClick={fetchReturns}
            className="px-4 py-1.5 bg-rose-700 text-white text-xs font-medium rounded-lg hover:bg-rose-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="py-16 text-center bg-[#fbf9f6] border border-[#e5dfd8] rounded-xl space-y-4 p-8">
          <div className="w-12 h-12 rounded-full bg-[#c29d59]/15 text-[#c29d59] flex items-center justify-center mx-auto">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-base text-neutral-900 font-medium">No Return Requests Found</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
              You haven't requested any returns. Delivered orders are eligible for return within 7 days of delivery.
            </p>
          </div>
          {onNavigateToOrders && (
            <button
              onClick={onNavigateToOrders}
              className="px-5 py-2 bg-[#121212] hover:bg-neutral-800 text-white text-xs font-medium rounded-lg transition-colors"
            >
              View Delivered Orders
            </button>
          )}
        </div>
      ) : (
        /* Return Cards List */
        <div className="space-y-5">
          {filteredReturns.map(ret => {
            const statusMeta = STATUS_CONFIG[ret.status] || STATUS_CONFIG.RETURN_REQUESTED;
            const isExpanded = expandedId === ret.id;
            const currentStep = getStepProgress(ret.status);
            const isRejected = ret.status === 'RETURN_REJECTED';

            return (
              <div
                key={ret.id}
                id={`return-card-${ret.returnRequestId}`}
                className="bg-white border border-[#e5dfd8] rounded-xl shadow-sm overflow-hidden transition-all hover:border-[#c29d59]/50"
              >
                {/* Card Header */}
                <div className="p-4 sm:p-5 bg-[#fbf9f6] border-b border-[#e5dfd8] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-[#121212] text-white flex items-center justify-center font-mono text-xs font-bold">
                      SB
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-neutral-900">{ret.returnRequestId}</span>
                        <span className="text-neutral-300">•</span>
                        <span className="text-xs text-neutral-600">Order #{ret.orderId.replace(/^#/, '')}</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Requested on {new Date(ret.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusMeta.badgeBg} ${statusMeta.color}`}>
                      {statusMeta.label}
                    </span>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : ret.id)}
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
                      title={isExpanded ? 'Collapse' : 'Expand details'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Product & Summary Body */}
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <img
                        src={ret.productImage || 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80'}
                        alt={ret.productName}
                        className="w-16 h-16 object-cover rounded-lg border border-[#e5dfd8] shrink-0"
                      />
                      <div>
                        <h4 className="font-medium text-sm text-neutral-900">{ret.productName}</h4>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          SKU: {ret.productSku || 'SB-RET'} • Qty: {ret.quantity}
                        </p>
                        <div className="flex items-center space-x-2 mt-1.5">
                          <span className="text-[10px] font-medium bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded">
                            {REASON_LABELS[ret.reason] || ret.reason}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-[#e5dfd8]">
                      <span className="text-xs text-neutral-500 block">Refund Amount</span>
                      <span className="font-serif text-base font-semibold text-neutral-900">
                        ₹{ret.refundAmount.toLocaleString('en-IN')}
                      </span>
                      <span className="block text-[11px] text-neutral-500 mt-0.5">
                        Status: <strong className="text-neutral-800">{ret.refundStatus}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Progress Tracker (unless rejected) */}
                  {!isRejected ? (
                    <div className="pt-3 pb-1">
                      <div className="relative flex items-center justify-between">
                        {/* Progress Bar Line */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-neutral-200 w-full z-0" />
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#c29d59] z-0 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, ((currentStep - 1) / (STEPS.length - 1)) * 100))}%` }}
                        />

                        {/* Step Nodes */}
                        {STEPS.map((step, idx) => {
                          const stepNumber = idx + 1;
                          const isDone = currentStep >= stepNumber;
                          const isCurrent = currentStep === stepNumber;

                          return (
                            <div key={step.key} className="relative z-10 flex flex-col items-center">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                  isDone
                                    ? 'bg-[#c29d59] text-white ring-4 ring-[#c29d59]/20'
                                    : 'bg-white border-2 border-neutral-300 text-neutral-400'
                                }`}
                              >
                                {isDone ? '✓' : stepNumber}
                              </div>
                              <span
                                className={`text-[10px] mt-1.5 font-medium hidden sm:block ${
                                  isCurrent ? 'text-neutral-900 font-bold' : isDone ? 'text-neutral-700' : 'text-neutral-400'
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Rejection Notice Banner */
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2.5">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-rose-900 space-y-0.5">
                        <p className="font-semibold">Return Request Declined</p>
                        <p className="text-rose-700">{ret.rejectionReason || 'Inspection requirements not satisfied.'}</p>
                      </div>
                    </div>
                  )}

                  {/* Reverse Pickup / Courier Banner if active */}
                  {ret.courierName && ret.trackingNumber && (
                    <div className="p-3.5 bg-[#fcfaf7] border border-[#e5dfd8] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center space-x-2.5">
                        <Truck className="w-4 h-4 text-[#c29d59] shrink-0" />
                        <div>
                          <span className="font-semibold text-neutral-900">{ret.courierName}</span>
                          <span className="text-neutral-500 ml-2">AWB: <strong className="font-mono text-neutral-800">{ret.trackingNumber}</strong></span>
                        </div>
                      </div>
                      {ret.pickupNotes && (
                        <span className="text-[11px] text-neutral-600 italic">"{ret.pickupNotes}"</span>
                      )}
                    </div>
                  )}

                  {/* Unboxing Notice if Pending */}
                  {ret.status === 'RETURN_REQUESTED' && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-start space-x-2.5 text-xs text-amber-900">
                      <Mail className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold">Unboxing Video Reminder</p>
                        <p className="text-[11px] text-amber-800">
                          Please ensure your continuous unboxing video has been emailed to <strong className="font-mono underline">stunningbirds236@gmail.com</strong> with subject <strong className="font-mono">"Return {ret.returnRequestId}"</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Expanded Accordion: Details & History */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-4 border-t border-[#e5dfd8] space-y-4 overflow-hidden"
                      >
                        {/* Patron Description */}
                        <div className="space-y-1 bg-[#fbf9f6] p-3 rounded-lg border border-[#e5dfd8]">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                            Your Explanation
                          </span>
                          <p className="text-xs text-neutral-800 leading-relaxed">{ret.description}</p>
                        </div>

                        {/* Inspection Result if inspected */}
                        {ret.inspectionResult && ret.inspectionResult !== 'PENDING' && (
                          <div className={`p-3 rounded-lg border text-xs space-y-1 ${
                            ret.inspectionResult === 'PASSED' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                          }`}>
                            <div className="flex items-center space-x-2 font-semibold">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Kolkata Atelier Inspection: {ret.inspectionResult}</span>
                            </div>
                            {ret.inspectionNotes && (
                              <p className="text-[11px] opacity-90">{ret.inspectionNotes}</p>
                            )}
                          </div>
                        )}

                        {/* Refund Details */}
                        {(ret.refundStatus === 'COMPLETED' || ['REFUNDED', 'RETURN_COMPLETED'].includes(ret.status)) && (
                          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-950 space-y-1.5">
                            <p className="font-semibold flex items-center space-x-1.5 text-emerald-900">
                              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span>Refund Processed: ₹{ret.refundAmount.toLocaleString('en-IN')}</span>
                            </p>
                            {ret.refundReference && (
                              <p className="text-[11px] font-mono text-emerald-800">
                                Transaction Reference: <strong className="font-bold">{ret.refundReference}</strong>
                              </p>
                            )}
                            {ret.refundedAt && (
                              <p className="text-[11px] text-emerald-700">
                                Refunded On: {new Date(ret.refundedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Chronological Audit Log */}
                        {ret.history && ret.history.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                              Status History & Updates
                            </span>
                            <div className="space-y-2">
                              {ret.history.map(item => (
                                <div key={item.id} className="text-xs flex items-start space-x-3 p-2 rounded bg-neutral-50 border border-neutral-200">
                                  <div className="w-2 h-2 rounded-full bg-[#c29d59] mt-1.5 shrink-0" />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-neutral-900">{item.newStatus}</span>
                                      <span className="text-[10px] text-neutral-400">
                                        {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    {item.note && <p className="text-[11px] text-neutral-600 mt-0.5">{item.note}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
