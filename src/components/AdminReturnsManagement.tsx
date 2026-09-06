import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Truck,
  ClipboardCheck,
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Mail,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  MapPin,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  DollarSign,
  Package,
} from 'lucide-react';
import { ReturnRequest, ReturnStatus, ReturnReason } from '../types';
import { supabase } from '../supabaseClient';

interface AdminReturnsManagementProps {
  authToken?: string;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'All', label: 'All Statuses' },
  { value: 'RETURN_REQUESTED', label: 'Pending Verification (Requested)' },
  { value: 'RETURN_APPROVED', label: 'Approved (Pending Logistics)' },
  { value: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled' },
  { value: 'PICKED_UP', label: 'Picked Up' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'RETURN_RECEIVED', label: 'Received at Atelier' },
  { value: 'INSPECTION_COMPLETED', label: 'Inspection Completed' },
  { value: 'RETURN_COMPLETED', label: 'Return Completed & Refunded' },
  { value: 'RETURN_REJECTED', label: 'Rejected' },
];

const REASON_LABELS: Record<ReturnReason, string> = {
  WRONG_PRODUCT: 'Wrong Product Delivered',
  DEFECTIVE_PRODUCT: 'Defective / Damaged Leather',
  MISSING_PRODUCT_PART: 'Missing Component / Accessory',
};

const COURIER_PARTNERS = [
  'Delhivery Surface / Express',
  'Blue Dart Express',
  'Shiprocket Return Logistics',
  'DTDC Express',
  'Ecom Express',
  'Shadowfax',
  'Custom Courier Partner',
];

export const AdminReturnsManagement: React.FC<AdminReturnsManagementProps> = ({ authToken }) => {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [reasonFilter, setReasonFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Active Modals State
  const [approvingItem, setApprovingItem] = useState<ReturnRequest | null>(null);
  const [rejectingItem, setRejectingItem] = useState<ReturnRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [courierItem, setCourierItem] = useState<ReturnRequest | null>(null);
  const [courierStatus, setCourierStatus] = useState<ReturnStatus>('PICKUP_SCHEDULED');
  const [courierName, setCourierName] = useState(COURIER_PARTNERS[0]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [inspectionItem, setInspectionItem] = useState<ReturnRequest | null>(null);
  const [inspectionResult, setInspectionResult] = useState<'PASSED' | 'FAILED'>('PASSED');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [refundingItem, setRefundingItem] = useState<ReturnRequest | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReference, setRefundReference] = useState('');
  const [refundTimestamp, setRefundTimestamp] = useState('');
  const [refundNotes, setRefundNotes] = useState('');
  const [refundTargetStatus, setRefundTargetStatus] = useState<'REFUNDED' | 'RETURN_COMPLETED'>('REFUNDED');
  const [completingItem, setCompletingItem] = useState<ReturnRequest | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const getValidToken = async (): Promise<string> => {
    if (authToken) return authToken;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const safeFetchJson = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText || 'Internal Server Error'}`);
      }
      throw new Error('Unexpected non-JSON response received from server.');
    }
    return { res, data };
  };

  const fetchReturns = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getValidToken();

      let url = `/api/returns?status=${statusFilter}&reason=${reasonFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const { res, data } = await safeFetchJson(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: 'no-store',
      });
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load return requests');
      }
      setReturns(data.returns || []);
    } catch (err: any) {
      console.error('Error fetching admin returns:', err);
      setError(err?.message || 'Failed to fetch returns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [authToken, statusFilter, reasonFilter]);

  // Actions
  const handleApprove = (ret: ReturnRequest) => {
    setApprovingItem(ret);
    setActionError(null);
  };

  const handleApproveSubmit = async () => {
    if (!approvingItem) return;
    const returnKey = approvingItem.returnRequestId || approvingItem.id;

    setActionLoading(true);
    setActionError(null);
    try {
      const token = await getValidToken();

      const { res, data } = await safeFetchJson(`/api/admin/returns/${encodeURIComponent(returnKey)}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to approve return');
      setApprovingItem(null);
      await fetchReturns();
    } catch (err: any) {
      setActionError(err?.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem) return;
    if (rejectionReason.trim().length < 5) {
      setActionError('Please provide a reason of at least 5 characters.');
      return;
    }

    const returnKey = rejectingItem.returnRequestId || rejectingItem.id;
    setActionLoading(true);
    setActionError(null);
    try {
      const token = await getValidToken();

      const { res, data } = await safeFetchJson(`/api/admin/returns/${encodeURIComponent(returnKey)}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to reject return');
      setRejectingItem(null);
      setRejectionReason('');
      await fetchReturns();
    } catch (err: any) {
      setActionError(err?.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCourierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierItem) return;

    const returnKey = courierItem.returnRequestId || courierItem.id;
    setActionLoading(true);
    setActionError(null);
    try {
      const token = await getValidToken();

      const { res, data } = await safeFetchJson(`/api/admin/returns/${encodeURIComponent(returnKey)}/courier-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: courierStatus,
          courierName,
          trackingNumber: trackingNumber.trim() || undefined,
          pickupNotes: pickupNotes.trim() || undefined,
        }),
      });
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update courier status');
      setCourierItem(null);
      await fetchReturns();
    } catch (err: any) {
      setActionError(err?.message || 'Courier status update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionItem) return;
    if (inspectionNotes.trim().length < 5) {
      setActionError('Please provide detailed inspection notes (at least 5 characters).');
      return;
    }

    const returnKey = inspectionItem.returnRequestId || inspectionItem.id;
    setActionLoading(true);
    setActionError(null);
    try {
      const token = await getValidToken();

      const { res, data } = await safeFetchJson(`/api/admin/returns/${encodeURIComponent(returnKey)}/inspection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          inspectionResult,
          inspectionNotes: inspectionNotes.trim(),
        }),
      });
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to record inspection');
      setInspectionItem(null);
      setInspectionNotes('');
      await fetchReturns();
    } catch (err: any) {
      setActionError(err?.message || 'Inspection recording failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundingItem) return;

    if (!refundReference.trim()) {
      setActionError('Please provide the transaction reference ID for this manual refund.');
      return;
    }

    const returnKey = refundingItem.returnRequestId || refundingItem.id;
    setActionLoading(true);
    setActionError(null);
    try {
      const token = await getValidToken();

      const { res, data } = await safeFetchJson(`/api/admin/returns/${encodeURIComponent(returnKey)}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          refundAmount: refundAmount > 0 ? refundAmount : undefined,
          refundReference: refundReference.trim(),
          refundedAt: refundTimestamp ? new Date(refundTimestamp).toISOString() : undefined,
          notes: refundNotes.trim() || undefined,
          status: refundTargetStatus,
        }),
      });
      if (!res.ok || !data.success) throw new Error(data.error || 'Refund recording failed');
      setRefundingItem(null);
      setRefundReference('');
      setRefundNotes('');
      await fetchReturns();
      alert(`Refund of ₹${data.refundAmount.toLocaleString('en-IN')} successfully recorded! Reference: ${data.refundReference}`);
    } catch (err: any) {
      setActionError(err?.message || 'Refund recording failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCompleteModal = (ret: ReturnRequest) => {
    setCompletingItem(ret);
    setCompletionNote('Return and refund lifecycle finalized by Atelier Management.');
    setActionError(null);
  };

  const handleCompleteSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!completingItem) return;
    const returnKey = completingItem.returnRequestId || completingItem.id;

    setActionLoading(true);
    setActionError(null);
    try {
      const token = await getValidToken();
      const { res, data } = await safeFetchJson(`/api/admin/returns/${encodeURIComponent(returnKey)}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: 'RETURN_COMPLETED',
          note: completionNote.trim() || 'Return and refund lifecycle finalized by Atelier Management.',
        }),
      });
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to complete return');
      setCompletingItem(null);
      setCompletionNote('');
      await fetchReturns();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to complete return');
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics
  const requestedCount = returns.filter(r => r.status === 'RETURN_REQUESTED').length;
  const approvedCount = returns.filter(r => r.status === 'RETURN_APPROVED').length;
  const inTransitCount = returns.filter(r => ['PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'].includes(r.status)).length;
  const inspectionPendingCount = returns.filter(r => r.status === 'RETURN_RECEIVED').length;
  const inspectionPassedCount = returns.filter(r => r.status === 'INSPECTION_COMPLETED').length;
  const completedCount = returns.filter(r => r.status === 'RETURN_COMPLETED' || r.status === 'REFUNDED').length;
  const totalRefundedAmount = returns
    .filter(r => r.refundStatus === 'COMPLETED')
    .reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0);

  return (
    <div id="admin-returns-dashboard" className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-[#e5dfd8] p-3.5 rounded-xl">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">Pending Review</span>
          <span className="text-xl font-bold font-serif text-neutral-900 mt-1 block">{requestedCount}</span>
          <span className="text-[10px] text-neutral-400">Needs video check</span>
        </div>
        <div className="bg-white border border-[#e5dfd8] p-3.5 rounded-xl">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">Approved</span>
          <span className="text-xl font-bold font-serif text-neutral-900 mt-1 block">{approvedCount}</span>
          <span className="text-[10px] text-neutral-400">Ready for pickup</span>
        </div>
        <div className="bg-white border border-[#e5dfd8] p-3.5 rounded-xl">
          <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider block">In Transit</span>
          <span className="text-xl font-bold font-serif text-neutral-900 mt-1 block">{inTransitCount}</span>
          <span className="text-[10px] text-neutral-400">En route to Kolkata</span>
        </div>
        <div className="bg-white border border-[#e5dfd8] p-3.5 rounded-xl">
          <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider block">Atelier Received</span>
          <span className="text-xl font-bold font-serif text-neutral-900 mt-1 block">{inspectionPendingCount}</span>
          <span className="text-[10px] text-neutral-400">Needs inspection</span>
        </div>
        <div className="bg-white border border-[#e5dfd8] p-3.5 rounded-xl">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Ready Refund</span>
          <span className="text-xl font-bold font-serif text-neutral-900 mt-1 block">{inspectionPassedCount}</span>
          <span className="text-[10px] text-neutral-400">Passed inspection</span>
        </div>
        <div className="bg-white border border-[#e5dfd8] p-3.5 rounded-xl">
          <span className="text-[11px] font-semibold text-neutral-800 uppercase tracking-wider block">Total Refunded</span>
          <span className="text-lg font-bold font-serif text-neutral-900 mt-1 block">₹{totalRefundedAmount.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-neutral-400">{completedCount} completed</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-[#e5dfd8] rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search Return ID, Order #, Patron email or AWB..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchReturns()}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-[#e5dfd8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c29d59]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs bg-neutral-50 border border-[#e5dfd8] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#c29d59]"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={reasonFilter}
            onChange={e => setReasonFilter(e.target.value)}
            className="text-xs bg-neutral-50 border border-[#e5dfd8] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#c29d59]"
          >
            <option value="All">All Reasons</option>
            <option value="WRONG_PRODUCT">Wrong Product Delivered</option>
            <option value="DEFECTIVE_PRODUCT">Defective / Damaged Leather</option>
            <option value="MISSING_PRODUCT_PART">Missing Component / Accessory</option>
          </select>
        </div>

        <button
          onClick={fetchReturns}
          className="px-3.5 py-1.5 bg-[#121212] hover:bg-neutral-800 text-white text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Returns List / Table */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-white border border-[#e5dfd8] rounded-xl">
          <div className="w-8 h-8 border-2 border-[#c29d59] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-neutral-500">Loading returns catalog...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-sm text-rose-900 font-medium">{error}</p>
          <button
            onClick={fetchReturns}
            className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-medium rounded-lg"
          >
            Retry
          </button>
        </div>
      ) : returns.length === 0 ? (
        <div className="py-16 text-center bg-white border border-[#e5dfd8] rounded-xl space-y-3 p-6">
          <RotateCcw className="w-10 h-10 text-neutral-300 mx-auto" />
          <p className="text-sm text-neutral-600 font-medium">No return requests matching criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map(ret => {
            const isExpanded = expandedId === ret.id;

            return (
              <div
                key={ret.id}
                id={`admin-return-${ret.returnRequestId}`}
                className="bg-white border border-[#e5dfd8] rounded-xl shadow-sm overflow-hidden"
              >
                {/* Header Strip */}
                <div className="p-4 bg-[#fbf9f6] border-b border-[#e5dfd8] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-[#121212] text-[#c29d59] flex items-center justify-center font-mono text-xs font-bold">
                      RET
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-neutral-900">{ret.returnRequestId}</span>
                        <span className="text-neutral-300">•</span>
                        <span className="text-xs font-medium text-neutral-700">Order #{ret.orderId.replace(/^#/, '')}</span>
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        Patron: <strong>{ret.customerName}</strong> ({ret.customerEmail})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200">
                      {ret.status}
                    </span>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : ret.id)}
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Main Card Content */}
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <img
                        src={ret.productImage || 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80'}
                        alt={ret.productName}
                        className="w-14 h-14 object-cover rounded-lg border border-[#e5dfd8] shrink-0"
                      />
                      <div>
                        <h4 className="font-medium text-sm text-neutral-900">{ret.productName}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[11px] bg-[#c29d59]/15 text-[#8c6d37] font-semibold px-2 py-0.5 rounded">
                            {REASON_LABELS[ret.reason] || ret.reason}
                          </span>
                          <span className="text-xs text-neutral-500">Qty: {ret.quantity}</span>
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <span className="text-[11px] text-neutral-500 block">Eligible Refund</span>
                      <span className="font-serif text-base font-bold text-neutral-900">
                        ₹{ret.paidAmount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] block mt-0.5 text-neutral-500">
                        Refund: <strong className={ret.refundStatus === 'COMPLETED' ? 'text-emerald-700' : 'text-amber-700'}>{ret.refundStatus}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Customer Description & Unboxing Check */}
                  <div className="bg-[#fcfaf7] border border-[#e5dfd8] p-3 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 font-medium">
                      <span>PATRON DESCRIPTION</span>
                      <span className="text-emerald-700 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Unboxing Video Email Acknowledged</span>
                      </span>
                    </div>
                    <p className="text-neutral-800 italic">"{ret.description}"</p>
                  </div>

                  {/* Current Status Highlights (Courier / Inspection / Refund) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {/* Courier Info */}
                    <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg">
                      <span className="text-[10px] text-neutral-500 font-semibold uppercase block">Reverse Courier</span>
                      {ret.courierName ? (
                        <div className="mt-1">
                          <p className="font-semibold text-neutral-900">{ret.courierName}</p>
                          <p className="text-[11px] font-mono text-neutral-600">AWB: {ret.trackingNumber || 'Pending AWB'}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-neutral-400 mt-1">Not assigned yet</p>
                      )}
                    </div>

                    {/* Inspection Info */}
                    <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg">
                      <span className="text-[10px] text-neutral-500 font-semibold uppercase block">Atelier Inspection</span>
                      {ret.inspectionResult && ret.inspectionResult !== 'PENDING' ? (
                        <div className="mt-1">
                          <p className={`font-semibold ${ret.inspectionResult === 'PASSED' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {ret.inspectionResult}
                          </p>
                          <p className="text-[11px] text-neutral-600 truncate">{ret.inspectionNotes || 'No notes'}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-neutral-400 mt-1">Pending physical arrival</p>
                      )}
                    </div>

                    {/* Refund Info */}
                    <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg">
                      <span className="text-[10px] text-neutral-500 font-semibold uppercase block">Refund Settlement</span>
                      {ret.refundStatus === 'COMPLETED' ? (
                        <div className="mt-1">
                          <p className="font-semibold text-emerald-700">₹{ret.refundAmount.toLocaleString('en-IN')} Refunded</p>
                          <p className="text-[11px] font-mono text-neutral-600 truncate">Ref: {ret.refundReference}</p>
                        </div>
                      ) : ret.refundStatus === 'FAILED' ? (
                        <div className="mt-1">
                          <p className="font-semibold text-rose-700">Refund Failed</p>
                          <p className="text-[11px] text-rose-600 truncate">{ret.refundFailureReason}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-neutral-400 mt-1">Pending inspection pass</p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#e5dfd8]">
                    {/* 1. Approval / Rejection (When REQUESTED) */}
                    {ret.status === 'RETURN_REQUESTED' && (
                      <>
                        <button
                          onClick={() => handleApprove(ret)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve Return</span>
                        </button>
                        <button
                          onClick={() => {
                            setRejectingItem(ret);
                            setRejectionReason('');
                            setActionError(null);
                          }}
                          disabled={actionLoading}
                          className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {/* 2. Courier / Reverse Logistics (When APPROVED or in transit) */}
                    {['RETURN_APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'].includes(ret.status) && (
                      <button
                        onClick={() => {
                          setCourierItem(ret);
                          setCourierStatus(
                            ret.status === 'RETURN_APPROVED' ? 'PICKUP_SCHEDULED' :
                            ret.status === 'PICKUP_SCHEDULED' ? 'PICKED_UP' :
                            ret.status === 'PICKED_UP' ? 'IN_TRANSIT' : 'RETURN_RECEIVED'
                          );
                          setCourierName(ret.courierName || COURIER_PARTNERS[0]);
                          setTrackingNumber(ret.trackingNumber || '');
                          setPickupNotes(ret.pickupNotes || '');
                          setActionError(null);
                        }}
                        className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-colors"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Update Reverse Logistics</span>
                      </button>
                    )}

                    {/* 3. Inspection (When RETURN_RECEIVED or already inspected) */}
                    {['RETURN_RECEIVED', 'INSPECTION_COMPLETED'].includes(ret.status) && (
                      <button
                        onClick={() => {
                          setInspectionItem(ret);
                          setInspectionResult(ret.inspectionResult === 'FAILED' ? 'FAILED' : 'PASSED');
                          setInspectionNotes(ret.inspectionNotes || '');
                          setActionError(null);
                        }}
                        className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-colors"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>{ret.inspectionResult && ret.inspectionResult !== 'PENDING' ? 'Update Inspection' : 'Record Physical Inspection'}</span>
                      </button>
                    )}

                    {/* 4. Trigger Refund (When INSPECTION_COMPLETED and PASSED) */}
                    {ret.status === 'INSPECTION_COMPLETED' && ret.inspectionResult === 'PASSED' && ret.refundStatus !== 'COMPLETED' && (
                      <button
                        onClick={() => {
                          setRefundingItem(ret);
                          setRefundAmount(ret.paidAmount);
                          setRefundReference(`REF-SB-${Date.now().toString(36).toUpperCase()}`);
                          setRefundTimestamp(new Date().toISOString().slice(0, 16));
                          setRefundNotes('');
                          setRefundTargetStatus('REFUNDED');
                          setActionError(null);
                        }}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Record Manual Refund (₹{ret.paidAmount.toLocaleString('en-IN')})</span>
                      </button>
                    )}

                    {/* 5. Complete Return Lifecycle (When REFUNDED) */}
                    {ret.status === 'REFUNDED' && (
                      <button
                        id={`mark-complete-btn-${ret.returnRequestId}`}
                        onClick={() => handleOpenCompleteModal(ret)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Return Completed</span>
                      </button>
                    )}

                    {/* Retry / Edit Refund if needed */}
                    {ret.refundStatus === 'FAILED' && (
                      <button
                        onClick={() => {
                          setRefundingItem(ret);
                          setRefundAmount(ret.paidAmount);
                          setRefundReference(`REF-SB-${Date.now().toString(36).toUpperCase()}`);
                          setRefundTimestamp(new Date().toISOString().slice(0, 16));
                          setRefundNotes('');
                          setRefundTargetStatus('REFUNDED');
                          setActionError(null);
                        }}
                        className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Record Manual Refund</span>
                      </button>
                    )}
                  </div>

                  {/* Expanded Accordion: Full History & Audit Log */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-4 border-t border-[#e5dfd8] space-y-3 overflow-hidden"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">
                            Audit Trail & Status History
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">ID: {ret.id}</span>
                        </div>

                        {ret.history && ret.history.length > 0 ? (
                          <div className="space-y-2">
                            {ret.history.map(hist => (
                              <div key={hist.id} className="text-xs p-2.5 rounded-lg bg-[#fbf9f6] border border-[#e5dfd8] flex items-start space-x-2.5">
                                <div className="w-2 h-2 rounded-full bg-[#c29d59] mt-1.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-neutral-900">{hist.newStatus}</span>
                                    <span className="text-[10px] text-neutral-500">
                                      {new Date(hist.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • by {hist.changedBy} ({hist.changedByRole})
                                    </span>
                                  </div>
                                  {hist.note && <p className="text-[11px] text-neutral-600 mt-1">{hist.note}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-neutral-500 italic">No additional audit logs recorded.</p>
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

      {/* ================= MODAL: APPROVE RETURN ================= */}
      <AnimatePresence>
        {approvingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-[#e5dfd8] rounded-xl shadow-2xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center space-x-2.5 text-emerald-800 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                <span>Approve Return Request ({approvingItem.returnRequestId})</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Approve return for Order <strong>#{approvingItem.orderId.replace(/^#/, '')}</strong> ({approvingItem.productName}). This confirms email unboxing video verification and authorizes reverse pickup scheduling.
              </p>

              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                  {actionError}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovingItem(null)}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-[#e5dfd8] text-xs font-medium rounded-lg hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveSubmit()}
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium rounded-lg flex items-center space-x-2 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Approving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Approval</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: REJECT RETURN ================= */}
      <AnimatePresence>
        {rejectingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-[#e5dfd8] rounded-xl shadow-2xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center space-x-2.5 text-rose-700 font-semibold text-sm">
                <XCircle className="w-5 h-5" />
                <span>Reject Return Request ({rejectingItem.returnRequestId})</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Please provide a formal justification for rejecting this return. The patron will be notified of this reason.
              </p>

              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="e.g. Unboxing video evidence not received within required window / item condition does not match defect claims..."
                  rows={4}
                  className="w-full text-xs p-3 border border-[#e5dfd8] rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setRejectingItem(null)}
                    disabled={actionLoading}
                    className="px-4 py-2 border border-[#e5dfd8] text-xs font-medium rounded-lg hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || rejectionReason.trim().length < 5}
                    className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                  >
                    {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: COURIER / REVERSE LOGISTICS ================= */}
      <AnimatePresence>
        {courierItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white border border-[#e5dfd8] rounded-xl shadow-2xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center space-x-2.5 text-indigo-700 font-semibold text-sm">
                <Truck className="w-5 h-5" />
                <span>Reverse Logistics & Pickup ({courierItem.returnRequestId})</span>
              </div>

              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleCourierSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Logistics Status</label>
                  <select
                    value={courierStatus}
                    onChange={e => setCourierStatus(e.target.value as any)}
                    className="w-full p-2.5 border border-[#e5dfd8] rounded-lg bg-neutral-50"
                  >
                    <option value="PICKUP_SCHEDULED">PICKUP_SCHEDULED (Pickup booked)</option>
                    <option value="PICKED_UP">PICKED_UP (Courier received item)</option>
                    <option value="IN_TRANSIT">IN_TRANSIT (En route to Kolkata)</option>
                    <option value="RETURN_RECEIVED">RETURN_RECEIVED (Delivered to Atelier)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Courier Partner</label>
                  <select
                    value={courierName}
                    onChange={e => setCourierName(e.target.value)}
                    className="w-full p-2.5 border border-[#e5dfd8] rounded-lg bg-neutral-50"
                  >
                    {COURIER_PARTNERS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Tracking Number / AWB</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    placeholder="e.g. 14328908234"
                    className="w-full p-2.5 border border-[#e5dfd8] rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Pickup Notes / Instructions</label>
                  <input
                    type="text"
                    value={pickupNotes}
                    onChange={e => setPickupNotes(e.target.value)}
                    placeholder="e.g. Pickup scheduled between 2 PM - 6 PM"
                    className="w-full p-2.5 border border-[#e5dfd8] rounded-lg"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setCourierItem(null)}
                    disabled={actionLoading}
                    className="px-4 py-2 border border-[#e5dfd8] text-xs font-medium rounded-lg hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-medium rounded-lg"
                  >
                    {actionLoading ? 'Updating...' : 'Save Logistics Update'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: KOLKATA PHYSICAL INSPECTION ================= */}
      <AnimatePresence>
        {inspectionItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white border border-[#e5dfd8] rounded-xl shadow-2xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center space-x-2.5 text-teal-800 font-semibold text-sm">
                <ClipboardCheck className="w-5 h-5" />
                <span>Kolkata Atelier Physical Inspection ({inspectionItem.returnRequestId})</span>
              </div>
              <p className="text-xs text-neutral-600">
                Inspect physical leather condition, hardware, stitching, tags, and original luxury packaging.
              </p>

              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleInspectionSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Inspection Verdict</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center space-x-2.5 p-3 rounded-lg border cursor-pointer ${
                      inspectionResult === 'PASSED' ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold' : 'border-[#e5dfd8]'
                    }`}>
                      <input
                        type="radio"
                        name="inspVerdict"
                        checked={inspectionResult === 'PASSED'}
                        onChange={() => setInspectionResult('PASSED')}
                      />
                      <span>PASSED (Eligible for Refund)</span>
                    </label>
                    <label className={`flex items-center space-x-2.5 p-3 rounded-lg border cursor-pointer ${
                      inspectionResult === 'FAILED' ? 'border-rose-600 bg-rose-50 text-rose-900 font-semibold' : 'border-[#e5dfd8]'
                    }`}>
                      <input
                        type="radio"
                        name="inspVerdict"
                        checked={inspectionResult === 'FAILED'}
                        onChange={() => setInspectionResult('FAILED')}
                      />
                      <span>FAILED (Withhold Refund)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Inspection Notes & Quality Assessment <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={inspectionNotes}
                    onChange={e => setInspectionNotes(e.target.value)}
                    placeholder="e.g. Leather inspected under studio lighting. Stitching defect verified on left spine gusset. Hardware undamaged. Luxury box intact."
                    rows={4}
                    className="w-full p-3 border border-[#e5dfd8] rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setInspectionItem(null)}
                    disabled={actionLoading}
                    className="px-4 py-2 border border-[#e5dfd8] text-xs font-medium rounded-lg hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || inspectionNotes.trim().length < 5}
                    className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                  >
                    {actionLoading ? 'Recording...' : 'Record Inspection'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: EXECUTE REFUND ================= */}
      <AnimatePresence>
        {refundingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white border border-[#e5dfd8] rounded-xl shadow-2xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center space-x-2.5 text-emerald-800 font-semibold text-sm">
                <CreditCard className="w-5 h-5" />
                <span>Record Manual Refund ({refundingItem.returnRequestId})</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Confirm manual refund transaction details for Order #{refundingItem.orderId.replace(/^#/, '')}.
              </p>

              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleRefundSubmit} className="space-y-4 text-xs">
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-emerald-800 uppercase font-semibold">Max Eligible Refund</span>
                    <p className="font-serif text-lg font-bold text-emerald-950">₹{refundingItem.paidAmount.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono">
                      Item: {refundingItem.productName}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-700 font-semibold mb-1">
                      Refund Amount (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={refundingItem.paidAmount}
                      value={refundAmount}
                      onChange={e => setRefundAmount(Number(e.target.value))}
                      className="w-full p-2.5 border border-[#e5dfd8] rounded-lg font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-700 font-semibold mb-1">
                      Refund Date & Time <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={refundTimestamp}
                      onChange={e => setRefundTimestamp(e.target.value)}
                      className="w-full p-2.5 border border-[#e5dfd8] rounded-lg font-mono text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Refund Transaction Reference / UTR / Payout ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={refundReference}
                    onChange={e => setRefundReference(e.target.value)}
                    placeholder="e.g. UTR-2394829384 or UPI-9034823904 or RAZORPAY-REF-10492"
                    className="w-full p-2.5 border border-[#e5dfd8] rounded-lg font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Target Status Transition
                  </label>
                  <select
                    value={refundTargetStatus}
                    onChange={e => setRefundTargetStatus(e.target.value as any)}
                    className="w-full p-2.5 border border-[#e5dfd8] rounded-lg text-xs"
                  >
                    <option value="REFUNDED">Mark as REFUNDED (Customer sees Refund Completed)</option>
                    <option value="RETURN_COMPLETED">Mark as RETURN_COMPLETED (Finalize entire lifecycle)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Administrative Notes (Optional)
                  </label>
                  <textarea
                    value={refundNotes}
                    onChange={e => setRefundNotes(e.target.value)}
                    placeholder="e.g. Refund issued to patron's original payment bank account via IMPS..."
                    rows={2}
                    className="w-full p-2.5 border border-[#e5dfd8] rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRefundingItem(null)}
                    disabled={actionLoading}
                    className="px-4 py-2 border border-[#e5dfd8] text-xs font-medium rounded-lg hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || !refundReference.trim() || refundAmount <= 0}
                    className="px-6 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium rounded-lg flex items-center space-x-2 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving Refund...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Confirm Refund ₹{refundAmount.toLocaleString('en-IN')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: COMPLETE RETURN LIFECYCLE ================= */}
      <AnimatePresence>
        {completingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white border border-[#e5dfd8] rounded-xl shadow-2xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center space-x-2.5 text-indigo-800 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Mark Return Completed ({completingItem.returnRequestId})</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Finalize and close the return lifecycle for Order #{completingItem.orderId.replace(/^#/, '')}. This securely sets status to <strong className="text-neutral-900">RETURN_COMPLETED</strong>, records audit status history, and concludes the patron's return case.
              </p>

              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                  {actionError}
                </div>
              )}

              <div className="p-3.5 bg-neutral-50 border border-[#e5dfd8] rounded-lg text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Patron:</span>
                  <span className="font-medium text-neutral-800">{completingItem.customerName} ({completingItem.customerEmail})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Product:</span>
                  <span className="font-medium text-neutral-800">{completingItem.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Refund Settlement:</span>
                  <span className="font-medium text-emerald-700">₹{(completingItem.refundAmount || completingItem.paidAmount).toLocaleString('en-IN')} (Completed)</span>
                </div>
                {completingItem.refundReference && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Refund Reference:</span>
                    <span className="font-mono text-neutral-700">{completingItem.refundReference}</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Completion Notes / Closing Remarks (Optional)
                  </label>
                  <textarea
                    value={completionNote}
                    onChange={e => setCompletionNote(e.target.value)}
                    placeholder="e.g. Return and refund lifecycle finalized by Atelier Management."
                    rows={3}
                    className="w-full p-2.5 border border-[#e5dfd8] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCompletingItem(null);
                      setActionError(null);
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 border border-[#e5dfd8] text-xs font-medium rounded-lg hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    id="confirm-mark-return-completed-btn"
                    className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-medium rounded-lg flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Completing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Mark Completed</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
