import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Sparkles, 
  Package, 
  Clock, 
  CheckCircle2, 
  Heart, 
  Award, 
  Truck, 
  ArrowRight,
  Shield,
  HelpCircle,
  Download,
  FileText,
  Eye,
  MapPin,
  Calendar,
  CreditCard,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Sparkle,
  Copy,
  Check,
  X
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { formatINR } from '../utils/formatCurrency';
import { Order } from '../types';
import { 
  generateAndDownloadInvoicePDF, 
  verifyOrderOwnership, 
  ATELIER_STORE_CONFIG 
} from '../utils/invoicePdfGenerator';
import { InvoiceModal } from './InvoiceModal';
import { supabase } from '../supabaseClient';

export const getFulfillmentBadgeClass = (status?: string) => {
  const norm = (status || '').toUpperCase();
  switch (norm) {
    case 'CRAFTING':
      return 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]';
    case 'SHIPPED':
      return 'bg-[#e0f2fe] text-[#075985] border-[#bae6fd]';
    case 'PROCESSING':
    case 'CONFIRMED':
    case 'PENDING':
      return 'bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]';
    case 'DELIVERED':
      return 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0]';
    default:
      return 'bg-[#f6f2ea] text-[#78716c] border-[#ded5c7]';
  }
};

export const getFulfillmentDisplayLabel = (status?: string) => {
  const norm = (status || '').toUpperCase();
  switch (norm) {
    case 'CRAFTING':
      return 'At the Atelier';
    case 'SHIPPED':
      return 'Dispatched';
    case 'PROCESSING':
    case 'CONFIRMED':
    case 'PENDING':
      return 'Processing';
    case 'DELIVERED':
      return 'Delivered';
    default:
      return status || 'Processing';
  }
};

export const getFulfillmentStepIndex = (status?: string): number => {
  const norm = (status || '').toUpperCase();
  if (norm === 'PROCESSING' || norm === 'CONFIRMED' || norm === 'PENDING') return 0;
  if (norm === 'CRAFTING') return 1;
  if (norm === 'SHIPPED') return 2;
  if (norm === 'DELIVERED') return 3;
  return 1;
};

export const AccountScreen: React.FC = () => {
  const {
    userProfile,
    orders,
    products,
    openProductBySlug,
    addToCart,
    toggleWishlist,
    setCurrentScreen,
    refetchOrders,
    isLoggedIn,
    openAuthModal,
    logout,
    showToast,
  } = useShop();

  const [activeTab, setActiveTab] = useState<'overview' | 'commissions' | 'care' | 'settings'>('overview');
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [trackingModalOrder, setTrackingModalOrder] = useState<Order | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [hasCopiedAwb, setHasCopiedAwb] = useState(false);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setCurrentScreen('login');
        window.location.hash = '/login';
      } else {
        refetchOrders();
      }
    });
  }, [refetchOrders]);

  // If user is not logged in, render the dedicated Patron Sign In prompt
  if (!isLoggedIn) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-8">
        <div className="w-16 h-16 rounded-full bg-[#181614] text-[#d4af37] flex items-center justify-center mx-auto shadow-md">
          <User className="w-8 h-8 stroke-[1.5]" />
        </div>

        <div className="space-y-3">
          <span className="text-[10px] uppercase tracking-widest text-[#8c562e] font-bold">
            CLIENT ATELIER ACCESS
          </span>
          <h1 className="font-serif-luxury text-3xl sm:text-4xl font-bold text-[#181614]">
            Sign In to Access Your Client Portal
          </h1>
          <p className="text-sm text-[#6e665e] max-w-md mx-auto leading-relaxed">
            Track your bespoke handcrafted commissions, download official tax invoices, and manage your admired leather pieces.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={() => openAuthModal('login', undefined, 'Sign in to access your client portal')}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#181614] hover:bg-[#8c562e] text-white text-xs font-semibold uppercase tracking-widest transition-colors rounded-xs shadow-md cursor-pointer"
          >
            Sign In
          </button>
          <button
            onClick={() => openAuthModal('register', undefined, 'Create an account to start earning points')}
            className="w-full sm:w-auto px-8 py-3.5 bg-white border border-[#ded5c7] hover:bg-[#f6f2ea] text-[#181614] text-xs font-semibold uppercase tracking-widest transition-colors rounded-xs cursor-pointer"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  // Find user's orders matching email or user ID or admin privilege
  const userOrders = orders.filter(o => {
    if (userProfile.isAdmin) return true;
    const profileEmail = (userProfile.email || '').trim().toLowerCase();
    const orderEmail = (o.customer?.email || '').trim().toLowerCase();
    const emailMatch = profileEmail && orderEmail && profileEmail === orderEmail;
    const userIdMatch = userProfile.id && ((o as any).userId === userProfile.id || (o as any).user_id === userProfile.id);
    return Boolean(emailMatch || userIdMatch);
  });

  const latestOrder = userOrders[0] || null;
  const admiredProducts = products.filter(p => userProfile.wishlistProductIds.includes(p.id));

  // Handler for downloading invoice PDF directly
  const handleDownloadInvoice = async (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Security check: verify logged-in customer ownership
    const authCheck = verifyOrderOwnership(order, userProfile);
    if (!authCheck.allowed) {
      showToast(authCheck.reason || 'Unauthorized order access');
      return;
    }

    try {
      setDownloadingOrderId(order.id);
      await generateAndDownloadInvoicePDF(order, products, userProfile, ATELIER_STORE_CONFIG);
      const cleanId = order.id.replace(/[^a-zA-Z0-9-]/g, '');
      showToast(`Downloaded Invoice-${cleanId}.pdf successfully`);
    } catch (err: any) {
      console.error('Invoice generation error:', err);
      showToast(err.message || 'Failed to generate invoice PDF');
    } finally {
      setDownloadingOrderId(null);
    }
  };

  // Handler for previewing invoice modal
  const handleOpenPreview = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPreviewOrder(order);
    setIsInvoiceModalOpen(true);
  };

  // Track Consignment clipboard copy & notification + open tracking modal
  const handleTrackConsignment = (order: Order) => {
    const awb = order.shippingLabel?.awbNumber || `AWB-${order.id.replace('#', '')}`;
    navigator.clipboard.writeText(awb);
    setHasCopiedAwb(true);
    setTimeout(() => setHasCopiedAwb(false), 2500);
    setTrackingModalOrder(order);
    setIsTrackingModalOpen(true);
    showToast(`Consignment ${awb} copied. Tracking live dispatch.`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-10">
      
      {/* Top Banner / Account Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#ece4d8]"
      >
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#8c562e] font-bold">Client Portal</span>
          <h1 className="font-serif-luxury text-3xl sm:text-4xl font-bold text-[#181614]">
            Welcome, {userProfile.name}
          </h1>
        </div>

        {/* Tab Navigation & Sign Out */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex space-x-1 bg-[#f6f2ea] p-1 rounded-xs border border-[#ded5c7] text-xs font-semibold">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'commissions', label: `Commissions (${userOrders.length})` },
              { id: 'care', label: 'Patina Care' },
              { id: 'settings', label: 'Preferences' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-3.5 py-1.5 rounded-xs transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-[#554e47] hover:text-[#181614]'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="accountTabBackground"
                    className="absolute inset-0 bg-[#181614] rounded-xs shadow-2xs z-0"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={logout}
            className="px-3 py-1.5 text-xs text-[#8c827a] hover:text-[#991b1b] hover:bg-black/5 rounded-xs transition-colors cursor-pointer font-medium"
            title="Sign out of your atelier profile"
          >
            Sign Out
          </button>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Left Column: User Profile & Society Points Card */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-4 space-y-6"
        >
          
          {/* Profile Card */}
          <div className="bg-[#f6f2ea] border border-[#e4d9cb] rounded-xs p-6 space-y-6 text-center shadow-xs">
            
            <div className="relative mx-auto w-20 h-20 rounded-full bg-[#181614] border-2 border-[#d4af37] flex items-center justify-center text-xl font-serif-luxury font-bold text-[#faf7f2] shadow-md">
              <span>{userProfile.avatarInitials}</span>
              <div className="absolute -bottom-1 -right-1 p-1 bg-[#d4af37] rounded-full text-black">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-serif-luxury text-xl font-bold text-[#181614]">
                {userProfile.name}
              </h3>
              <p className="text-xs text-[#78716c]">{userProfile.email}</p>
              <div className="inline-block mt-2 px-3 py-1 bg-[#181614] text-[#d4af37] rounded-full text-[10px] font-bold tracking-widest uppercase">
                {userProfile.tier}
              </div>
            </div>

            <div className="border-t border-[#ded3c2] pt-4 text-xs text-[#78716c] flex justify-between">
              <span>Member Since</span>
              <span className="font-medium text-[#181614]">{userProfile.memberSince}</span>
            </div>

          </div>

          {/* Society Points Widget with Animated Progress Bar */}
          <div className="bg-white border border-[#e4d9cb] rounded-xs p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-[#8c562e]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#181614]">
                  Society Points
                </h4>
              </div>
              <span className="font-serif-luxury text-lg font-bold text-[#8c562e]">
                {userProfile.societyPoints.toLocaleString()} PTS
              </span>
            </div>

            <p className="text-xs text-[#6e665e] leading-relaxed">
              You are currently earning 1 point per ₹100 spent on all bespoke leather goods. Next Tier (Master Patron) at 25,000 PTS.
            </p>

            <div className="w-full bg-[#eee7dc] h-2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${Math.min(100, (userProfile.societyPoints / 25000) * 100)}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="bg-[#8c562e] h-full rounded-full"
              />
            </div>
          </div>

          {/* Quick Support & Warranty Box */}
          <div className="bg-[#fbf9f5] border border-[#e8dfd3] rounded-xs p-5 space-y-3 text-xs text-[#6e665e]">
            <div className="flex items-center gap-2 font-bold text-[#181614] uppercase tracking-wider text-[11px]">
              <ShieldCheck className="w-4 h-4 text-[#8c562e]" />
              <span>14-Day Atelier Craft Warranty</span>
            </div>
            <p className="leading-relaxed text-[11.5px]">
              Every piece leaving our Kolkata atelier includes complimentary inspection, edge conditioning, and tax invoices.
            </p>
            <div className="pt-2 border-t border-[#ded5c7] flex justify-between items-center text-[11px]">
              <span className="text-[#8c562e] font-semibold">Concierge Support</span>
              <span className="font-mono text-[#181614]">{ATELIER_STORE_CONFIG.phone}</span>
            </div>
          </div>

        </motion.aside>

        {/* Right Column: Tab Content */}
        <motion.main
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="lg:col-span-8 space-y-8"
        >
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Latest Commission Live Progress Tracker */}
              {latestOrder && (() => {
                const stepIdx = getFulfillmentStepIndex(latestOrder.fulfillmentStatus);
                const progressWidth = stepIdx === 3 ? '100%' : (stepIdx === 2 ? '75%' : (stepIdx === 1 ? '50%' : '25%'));
                const progressHeight = stepIdx === 3 ? '100%' : (stepIdx === 2 ? '66%' : (stepIdx === 1 ? '33%' : '0%'));

                return (
                <div className="bg-white border border-[#e4d9cb] rounded-xs p-6 sm:p-8 space-y-6 shadow-xs">
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#f0eae0] pb-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-[#8c562e] font-bold">Active Order</span>
                      <h2 className="font-serif-luxury text-2xl font-bold text-[#181614]">
                        Latest Commission {latestOrder.id}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider border ${getFulfillmentBadgeClass(latestOrder.fulfillmentStatus)}`}>
                        {latestOrder.fulfillmentStatus || 'CRAFTING'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        latestOrder.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {latestOrder.paymentStatus || 'Paid'}
                      </span>
                    </div>
                  </div>

                  {/* Commission Item details */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-[#fbf9f5] border border-[#eee5d8] rounded-xs">
                    <img
                      src={(latestOrder.items && latestOrder.items[0]?.productImage) || 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80'}
                      alt="Commission item"
                      referrerPolicy="no-referrer"
                      className="w-20 h-24 object-cover rounded-xs border border-[#ded5c7]"
                    />
                    <div className="flex-1 text-center sm:text-left">
                      <h4 className="font-serif-luxury text-base font-bold text-[#181614]">
                        {(latestOrder.items && latestOrder.items[0]?.productName) || 'Heritage Leather Commission'}
                      </h4>
                      <p className="text-xs text-[#78716c]">
                        {(latestOrder.items && latestOrder.items[0]?.colorName) || 'Classic Leather'} • {formatINR(latestOrder.total)}
                      </p>
                      {latestOrder.items && latestOrder.items[0]?.monogram && (
                        <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#8c562e]">
                          <span>Monogram: [{latestOrder.items[0].monogram}]</span>
                          <span>• {latestOrder.items[0].foilColor || 'Gold'} Foil</span>
                        </div>
                      )}
                      {(latestOrder.items?.length || 0) > 1 && (
                        <p className="text-[11px] text-[#8c827a] mt-1">
                          + {(latestOrder.items?.length || 0) - 1} additional bespoke {(latestOrder.items?.length || 0) - 1 === 1 ? 'item' : 'items'}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-[#8c857d] block">Order Total</span>
                      <span className="font-serif-luxury text-base font-bold text-[#181614]">
                        {formatINR(latestOrder.total)}
                      </span>
                    </div>
                  </div>

                  {/* Multi-Step Timeline (Vertical on Mobile, Horizontal on sm+) */}
                  <div className="py-6 border-y border-[#f0eae0]">
                    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-6 sm:space-y-0">
                      
                      {/* Horizontal connecting background bar (Desktop) */}
                      <div className="hidden sm:block absolute top-1/2 left-4 right-4 -translate-y-1/2 h-[2px] bg-[#e4dcd0] z-0" />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: progressWidth }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`hidden sm:block absolute top-1/2 left-4 -translate-y-1/2 h-[2px] z-0 ${
                          stepIdx === 3 ? 'bg-emerald-600' : 'bg-[#8c562e]'
                        }`}
                      />

                      {/* Vertical connecting background bar (Mobile only) */}
                      <div className="sm:hidden absolute top-4 bottom-4 left-[15px] w-[2px] bg-[#e4dcd0] z-0" />
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: progressHeight }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`sm:hidden absolute top-4 left-[15px] w-[2px] z-0 ${
                          stepIdx === 3 ? 'bg-emerald-600' : 'bg-[#8c562e]'
                        }`}
                      />

                      {/* Step 1: Placed */}
                      <div className="relative z-10 flex flex-row sm:flex-col items-center sm:text-center gap-3.5 sm:gap-0 sm:space-y-2">
                        <div className="w-8 h-8 rounded-full bg-[#8c562e] text-white flex items-center justify-center shadow-xs shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 text-left sm:text-center">
                          <h5 className="text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#181614]">Order Placed</h5>
                          <span className="text-[11px] sm:text-[10px] text-[#8c857d] block">{latestOrder.date || 'Received'}</span>
                        </div>
                      </div>

                      {/* Step 2: At Atelier */}
                      <div className="relative z-10 flex flex-row sm:flex-col items-center sm:text-center gap-3.5 sm:gap-0 sm:space-y-2">
                        {stepIdx > 1 ? (
                          <div className="w-8 h-8 rounded-full bg-[#8c562e] text-white flex items-center justify-center shadow-xs shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : stepIdx === 1 ? (
                          <div className="w-8 h-8 rounded-full bg-[#d4af37] text-black ring-4 ring-[#d4af37]/30 flex items-center justify-center shadow-xs animate-pulse shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white border-2 border-[#cfc5b6] text-[#8c857d] flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left sm:text-center">
                          <h5 className={`text-xs sm:text-[11px] font-bold uppercase tracking-wider ${
                            stepIdx === 1 ? 'text-[#8c562e]' : (stepIdx > 1 ? 'text-[#181614]' : 'text-[#8c857d]')
                          }`}>
                            At The Atelier
                          </h5>
                          <span className={`text-[11px] sm:text-[10px] block ${
                            stepIdx === 1 ? 'text-[#8c562e] font-medium' : 'text-[#8c857d]'
                          }`}>
                            {stepIdx > 1 ? 'Crafting Completed' : (stepIdx === 1 ? 'Stitching in Progress' : 'Queued for Crafting')}
                          </span>
                        </div>
                      </div>

                      {/* Step 3: Dispatched */}
                      <div className="relative z-10 flex flex-row sm:flex-col items-center sm:text-center gap-3.5 sm:gap-0 sm:space-y-2">
                        {stepIdx > 2 ? (
                          <div className="w-8 h-8 rounded-full bg-[#8c562e] text-white flex items-center justify-center shadow-xs shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : stepIdx === 2 ? (
                          <div className="w-8 h-8 rounded-full bg-[#0284c7] text-white ring-4 ring-[#0284c7]/30 flex items-center justify-center shadow-xs animate-pulse shrink-0">
                            <Truck className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white border-2 border-[#cfc5b6] text-[#8c857d] flex items-center justify-center shrink-0">
                            <Truck className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left sm:text-center">
                          <h5 className={`text-xs sm:text-[11px] font-bold uppercase tracking-wider ${
                            stepIdx === 2 ? 'text-[#0284c7]' : (stepIdx > 2 ? 'text-[#181614]' : 'text-[#8c857d]')
                          }`}>
                            Dispatched
                          </h5>
                          <span className={`text-[11px] sm:text-[10px] block ${
                            stepIdx === 2 ? 'text-[#0284c7] font-medium' : 'text-[#8c857d]'
                          }`}>
                            {stepIdx > 2 ? 'Express Courier' : (stepIdx === 2 ? 'In Transit' : 'Pending Dispatch')}
                          </span>
                        </div>
                      </div>

                      {/* Step 4: Delivered */}
                      <div className="relative z-10 flex flex-row sm:flex-col items-center sm:text-center gap-3.5 sm:gap-0 sm:space-y-2">
                        {stepIdx === 3 ? (
                          <div className="w-8 h-8 rounded-full bg-[#16a34a] text-white ring-4 ring-[#16a34a]/30 flex items-center justify-center shadow-xs shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white border-2 border-[#cfc5b6] text-[#8c857d] flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left sm:text-center">
                          <h5 className={`text-xs sm:text-[11px] font-bold uppercase tracking-wider ${
                            stepIdx === 3 ? 'text-[#166534]' : 'text-[#8c857d]'
                          }`}>
                            Delivered
                          </h5>
                          <span className={`text-[11px] sm:text-[10px] block ${
                            stepIdx === 3 ? 'text-[#166534] font-medium' : 'text-[#8c857d]'
                          }`}>
                            {stepIdx === 3 ? 'Safely Delivered' : 'Estimated 3-5 Days'}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Invoice & Tracking Actions Strip */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                    <button
                      onClick={() => handleTrackConsignment(latestOrder)}
                      className="text-xs font-semibold text-[#8c562e] hover:text-[#734320] flex items-center gap-1.5 cursor-pointer underline-offset-4 hover:underline"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Live Consignment & Courier Details</span>
                    </button>

                    {/* Action Buttons: [ Download Invoice ] [ Preview ] */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <motion.button
                        id={`download-invoice-btn-${latestOrder.id.replace(/[^a-zA-Z0-9-]/g, '')}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={downloadingOrderId === latestOrder.id}
                        onClick={(e) => handleDownloadInvoice(latestOrder, e)}
                        className="px-4 py-2 bg-[#181614] hover:bg-[#8c562e] text-white text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        title="Download Tax Invoice PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>{downloadingOrderId === latestOrder.id ? 'Generating...' : 'Download Invoice'}</span>
                      </motion.button>

                      <button
                        onClick={(e) => handleOpenPreview(latestOrder, e)}
                        className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-xs transition-colors cursor-pointer border border-[#ded5c7]"
                        title="Preview Invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
                );
              })()}

              {/* Recently Admired (Wishlist) Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 text-[#8c562e]" />
                    <h3 className="font-serif-luxury text-xl font-bold text-[#181614]">
                      Recently Admired
                    </h3>
                  </div>
                  <button
                    onClick={() => setCurrentScreen('shop')}
                    className="text-xs text-[#8c562e] font-semibold hover:underline cursor-pointer"
                  >
                    Browse Full Catalog
                  </button>
                </div>

                {admiredProducts.length === 0 ? (
                  <div className="bg-white border border-[#e4dcd0] p-8 text-center rounded-xs space-y-3">
                    <p className="text-xs text-[#78716c]">You have not added any pieces to your admired list yet.</p>
                    <button
                      onClick={() => setCurrentScreen('shop')}
                      className="px-5 py-2 bg-[#181614] hover:bg-[#8c562e] text-white text-xs uppercase tracking-wider font-semibold rounded-xs transition-colors cursor-pointer"
                    >
                      Explore Collection
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {admiredProducts.map((product, pIdx) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: pIdx * 0.08 }}
                        whileHover={{ y: -2 }}
                        className="flex space-x-4 p-4 bg-white border border-[#e4dcd0] rounded-xs shadow-2xs hover:border-[#8c562e] transition-all"
                      >
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-18 h-22 object-cover rounded-xs border border-[#ded5c7] cursor-pointer hover:scale-105 transition-transform duration-300"
                          onClick={() => openProductBySlug(product.slug)}
                        />
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h4
                              onClick={() => openProductBySlug(product.slug)}
                              className="font-serif-luxury text-sm font-bold text-[#181614] hover:text-[#8c562e] cursor-pointer transition-colors"
                            >
                              {product.name}
                            </h4>
                            <p className="text-xs text-[#78716c]">{formatINR(product.price)}</p>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <motion.button
                              whileTap={{ scale: 0.96 }}
                              onClick={() => addToCart(product, 1)}
                              className="px-3 py-1.5 bg-[#8c562e] hover:bg-[#734320] text-white text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                            >
                              Add to Bag
                            </motion.button>
                            <button
                              onClick={() => toggleWishlist(product.id)}
                              className="px-2 py-1.5 text-xs text-[#8c857d] hover:text-[#991b1b] cursor-pointer transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          )}

          {/* TAB 2: COMMISSIONS / MY ORDERS (Full List with Track & Download Invoice) */}
          {activeTab === 'commissions' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-[#ece4d8]">
                <div>
                  <h2 className="font-serif-luxury text-2xl font-bold text-[#181614]">
                    Your Bespoke Commissions
                  </h2>
                  <p className="text-xs text-[#6e665e]">
                    Review past and active orders, track consignments, and download official GST tax invoices.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold bg-[#f6f2ea] text-[#8c562e] px-3 py-1 rounded-full border border-[#ded5c7]">
                  {userOrders.length} {userOrders.length === 1 ? 'Order' : 'Orders'}
                </span>
              </div>

              {userOrders.length === 0 ? (
                <div className="bg-white border border-[#e4d9cb] rounded-xs p-12 text-center space-y-4">
                  <Package className="w-12 h-12 text-[#8c827a] mx-auto stroke-[1.2]" />
                  <h3 className="font-serif-luxury text-xl font-bold text-[#181614]">No Commissions Placed Yet</h3>
                  <p className="text-xs text-[#6e665e] max-w-sm mx-auto">
                    When you commission a bespoke leather piece from our atelier, your live tracking and invoices will appear here.
                  </p>
                  <button
                    onClick={() => setCurrentScreen('shop')}
                    className="px-6 py-2.5 bg-[#8c562e] hover:bg-[#734320] text-white text-xs uppercase tracking-widest font-semibold rounded-xs transition-colors cursor-pointer"
                  >
                    Commission a Piece
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {userOrders.map((order, orderIdx) => {
                    const isDownloadingThis = downloadingOrderId === order.id;
                    const cleanId = order.id.replace(/[^a-zA-Z0-9-]/g, '');

                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: orderIdx * 0.05 }}
                        className="bg-white border border-[#e4d9cb] rounded-xs overflow-hidden shadow-xs hover:border-[#8c562e] transition-colors"
                      >
                        {/* Order Header Card */}
                        <div className="bg-[#fbf9f5] px-6 py-4 border-b border-[#eee5d8] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono font-bold text-sm text-[#181614]">
                              {order.id}
                            </span>
                            <span className="text-xs text-[#78716c] flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{order.date || 'Oct 24, 2024'}</span>
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${getFulfillmentBadgeClass(order.fulfillmentStatus)}`}>
                              {order.fulfillmentStatus || 'PROCESSING'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {order.paymentStatus || 'Paid'}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[11px] text-[#8c827a] block">Grand Total</span>
                            <span className="font-serif-luxury text-base font-bold text-[#181614]">
                              {formatINR(order.total)}
                            </span>
                          </div>
                        </div>

                        {/* Order Items List */}
                        <div className="p-6 divide-y divide-[#f0eae0] space-y-4">
                          {(order.items || []).map((item, itemIdx) => {
                            const prod = products.find(p => p.id === item.productId || p.name === item.productName);
                            const sku = item.sku || prod?.sku || prod?.skuId || `SB-LTD-${100 + itemIdx}`;

                            return (
                              <div key={itemIdx} className={`${itemIdx > 0 ? 'pt-4' : ''} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
                                <div className="flex items-center gap-4">
                                  <img
                                    src={item.productImage || 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80'}
                                    alt={item.productName}
                                    referrerPolicy="no-referrer"
                                    className="w-16 h-18 object-cover rounded-xs border border-[#ded5c7]"
                                  />
                                  <div>
                                    <h4 className="font-serif-luxury text-sm font-bold text-[#181614]">
                                      {item.productName}
                                    </h4>
                                    <div className="text-[11px] text-[#78716c] flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                      <span className="font-mono">SKU: {sku}</span>
                                      {item.colorName && <span>Color: {item.colorName}</span>}
                                      <span>Qty: {item.quantity}</span>
                                    </div>
                                    {item.monogram && (
                                      <div className="mt-1 text-[11px] font-semibold text-[#8c562e]">
                                        Monogram: [{item.monogram}] • {item.foilColor || 'Gold'} Foil
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right sm:self-center">
                                  <span className="font-mono font-bold text-sm text-[#181614]">
                                    {formatINR((Number(item.price) || 0) * (Number(item.quantity) || 1))}
                                  </span>
                                  <span className="text-[10px] text-[#8c827a] block">
                                    {item.quantity} × {formatINR(item.price)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Order Footer & Action Bar: [ Track Consignment ] [ Download Invoice ] */}
                        <div className="bg-[#fbf9f5] px-6 py-3.5 border-t border-[#eee5d8] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="text-xs text-[#78716c] flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#8c562e] shrink-0" />
                            <span>
                              Delivering to: <strong className="text-[#181614]">{order.shippingAddress?.city || 'City'}, {order.shippingAddress?.state || 'State'} ({order.shippingAddress?.pincode || 'Postal Code'})</strong>
                            </span>
                          </div>

                          {/* EXACT LAYOUT: [ Track Consignment ] [ Download Invoice ] */}
                          <div className="flex flex-wrap items-center gap-2.5">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleTrackConsignment(order)}
                              className="px-4 py-2 bg-[#181614] hover:bg-[#8c562e] text-white text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Track Consignment</span>
                            </motion.button>

                            <motion.button
                              id={`download-invoice-btn-${cleanId}`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              disabled={isDownloadingThis}
                              onClick={(e) => handleDownloadInvoice(order, e)}
                              className="px-4 py-2 bg-white border border-[#181614] hover:bg-[#f6f2ea] text-[#181614] text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                              title="Download official Tax Invoice PDF"
                            >
                              <Download className="w-3.5 h-3.5 text-[#8c562e]" />
                              <span>{isDownloadingThis ? 'Generating...' : 'Download Invoice'}</span>
                            </motion.button>

                            <button
                              onClick={(e) => handleOpenPreview(order, e)}
                              className="p-2 text-gray-500 hover:text-black hover:bg-gray-200/60 rounded-xs transition-colors cursor-pointer"
                              title="Preview Invoice Modal"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PATINA CARE & LEATHER MAINTENANCE */}
          {activeTab === 'care' && (
            <div className="bg-white border border-[#e4d9cb] rounded-xs p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="border-b border-[#f0eae0] pb-4">
                <span className="text-[10px] uppercase tracking-widest text-[#8c562e] font-bold">Atelier Handbook</span>
                <h2 className="font-serif-luxury text-2xl font-bold text-[#181614]">
                  Full-Grain Leather Care & Patina Development
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#6e665e] leading-relaxed">
                <div className="p-4 bg-[#fbf9f5] border border-[#eee5d8] rounded-xs space-y-2">
                  <h4 className="font-serif-luxury font-bold text-sm text-[#181614]">Organic Patina Growth</h4>
                  <p>
                    Full-grain Italian and vegetable-tanned leathers absorb natural oils from handling. Expect rich honey-gold and caramel darkening along burnished bevels over months of daily use.
                  </p>
                </div>
                <div className="p-4 bg-[#fbf9f5] border border-[#eee5d8] rounded-xs space-y-2">
                  <h4 className="font-serif-luxury font-bold text-sm text-[#181614]">Conditioning Routine</h4>
                  <p>
                    Apply pure natural beeswax or lanolin-based leather balm every 4 to 6 months with a microfiber cloth to prevent drying and maintain deep fiber suppleness.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PREFERENCES & SAVED ADDRESSES */}
          {activeTab === 'settings' && (
            <div className="bg-white border border-[#e4d9cb] rounded-xs p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="border-b border-[#f0eae0] pb-4">
                <span className="text-[10px] uppercase tracking-widest text-[#8c562e] font-bold">Preferences</span>
                <h2 className="font-serif-luxury text-2xl font-bold text-[#181614]">
                  Saved Shipping Addresses & Delivery Profile
                </h2>
              </div>

              <div className="space-y-4">
                {userProfile.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-4 border border-[#e4d9cb] rounded-xs flex justify-between items-start text-xs bg-[#fbf9f5]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#181614]">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="px-2 py-0.5 bg-[#181614] text-[#d4af37] text-[9px] font-bold rounded-full uppercase">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[#6e665e]">{addr.addressLine}</p>
                      <p className="text-[#6e665e]">{addr.city}, {addr.state} - {addr.pincode}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </motion.main>

      </div>

      {/* Invoice Preview / Action Modal */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        order={previewOrder}
        products={products}
        currentUser={userProfile}
        showToast={showToast}
      />

      {/* Consignment Live Tracking Modal */}
      <AnimatePresence>
        {isTrackingModalOpen && trackingModalOrder && (() => {
          const stepIdx = getFulfillmentStepIndex(trackingModalOrder.fulfillmentStatus);
          const progressWidth = stepIdx === 3 ? '100%' : (stepIdx === 2 ? '75%' : (stepIdx === 1 ? '50%' : '25%'));
          const progressHeight = stepIdx === 3 ? '100%' : (stepIdx === 2 ? '66%' : (stepIdx === 1 ? '33%' : '0%'));
          const awb = trackingModalOrder.shippingLabel?.awbNumber || `AWB-${trackingModalOrder.id.replace('#', '')}`;
          const courier = trackingModalOrder.shippingLabel?.courierPartner || 'BlueDart Air Express';

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.3 }}
                className="bg-white border border-[#ded5c7] rounded-xs max-w-xl w-full shadow-2xl overflow-hidden my-8"
              >
                {/* Modal Header */}
                <div className="bg-[#181614] text-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#8c562e] flex items-center justify-center text-[#d4af37]">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-[#d4af37] font-bold block">Live Consignment Tracking</span>
                      <h3 className="font-serif-luxury text-lg font-bold text-white">Order {trackingModalOrder.id}</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsTrackingModalOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6">
                  {/* Status & Courier Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[#fbf9f5] border border-[#eee5d8] rounded-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#8c827a] block">Fulfillment Status</span>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider border ${getFulfillmentBadgeClass(trackingModalOrder.fulfillmentStatus)}`}>
                          {trackingModalOrder.fulfillmentStatus || 'PROCESSING'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#8c827a] block">Courier & Waybill (AWB)</span>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#181614]">{awb}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(awb);
                            setHasCopiedAwb(true);
                            setTimeout(() => setHasCopiedAwb(false), 2000);
                            showToast('AWB Copied');
                          }}
                          className="p-1 text-[#8c562e] hover:bg-[#8c562e]/10 rounded-xs transition-colors cursor-pointer"
                          title="Copy AWB"
                        >
                          {hasCopiedAwb ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <span className="text-[10px] text-[#78716c] block mt-0.5">{courier}</span>
                    </div>
                  </div>

                  {/* 4-Step Visual Timeline (Vertical on Mobile, Horizontal on sm+) */}
                  <div className="py-4 border-y border-[#f0eae0]">
                    <span className="text-[10px] uppercase tracking-widest text-[#8c562e] font-bold block mb-4 sm:mb-6">Fulfillment Milestone</span>
                    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-5 sm:space-y-0">
                      
                      {/* Horizontal connecting background bar (Desktop) */}
                      <div className="hidden sm:block absolute top-1/2 left-4 right-4 -translate-y-1/2 h-[2px] bg-[#e4dcd0] z-0" />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: progressWidth }}
                        transition={{ duration: 0.6 }}
                        className={`hidden sm:block absolute top-1/2 left-4 -translate-y-1/2 h-[2px] z-0 ${
                          stepIdx === 3 ? 'bg-emerald-600' : 'bg-[#8c562e]'
                        }`}
                      />

                      {/* Vertical connecting background bar (Mobile only) */}
                      <div className="sm:hidden absolute top-3.5 bottom-3.5 left-[13px] w-[2px] bg-[#e4dcd0] z-0" />
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: progressHeight }}
                        transition={{ duration: 0.6 }}
                        className={`sm:hidden absolute top-3.5 left-[13px] w-[2px] z-0 ${
                          stepIdx === 3 ? 'bg-emerald-600' : 'bg-[#8c562e]'
                        }`}
                      />

                      {/* 1. Placed */}
                      <div className="relative z-10 flex flex-row sm:flex-col items-center sm:text-center gap-3 sm:gap-0 sm:space-y-1.5">
                        <div className="w-7 h-7 rounded-full bg-[#8c562e] text-white flex items-center justify-center shadow-xs shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0 text-left sm:text-center">
                          <span className="text-[11px] sm:text-[10px] font-bold uppercase tracking-wider text-[#181614] block">Placed</span>
                          <span className="text-[10px] sm:text-[9px] text-[#8c857d] block">{trackingModalOrder.date || 'Received'}</span>
                        </div>
                      </div>

                      {/* 2. Atelier */}
                      <div className="relative z-10 flex flex-row sm:flex-col items-center sm:text-center gap-3 sm:gap-0 sm:space-y-1.5">
                        {stepIdx > 1 ? (
                          <div className="w-7 h-7 rounded-full bg-[#8c562e] text-white flex items-center justify-center shadow-xs shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        ) : stepIdx === 1 ? (
                          <div className="w-7 h-7 rounded-full bg-[#d4af37] text-black ring-4 ring-[#d4af37]/30 flex items-center justify-center shadow-xs animate-pulse shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-white border-2 border-[#cfc5b6] text-[#8c857d] flex items-center justify-center shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left sm:text-center">
                          <span className={`text-[11px] sm:text-[10px] font-bold uppercase tracking-wider block ${
                            stepIdx === 1 ? 'text-[#8c562e]' : (stepIdx > 1 ? 'text-[#181614]' : 'text-[#8c857d]')
                          }`}>
                            Atelier
                          </span>
                          <span className="text-[10px] sm:text-[9px] text-[#8c857d] block">
                            {stepIdx > 1 ? 'Crafted' : (stepIdx === 1 ? 'In Progress' : 'Queued')}
                          </span>
                        </div>
                      </div>

                      {/* 3. Dispatched */}
                      <div className="relative z-10 flex flex-row sm:flex-col items-center sm:text-center gap-3 sm:gap-0 sm:space-y-1.5">
                        {stepIdx > 2 ? (
                          <div className="w-7 h-7 rounded-full bg-[#8c562e] text-white flex items-center justify-center shadow-xs shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        ) : stepIdx === 2 ? (
                          <div className="w-7 h-7 rounded-full bg-[#0284c7] text-white ring-4 ring-[#0284c7]/30 flex items-center justify-center shadow-xs animate-pulse shrink-0">
                            <Truck className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-white border-2 border-[#cfc5b6] text-[#8c857d] flex items-center justify-center shrink-0">
                            <Truck className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left sm:text-center">
                          <span className={`text-[11px] sm:text-[10px] font-bold uppercase tracking-wider block ${
                            stepIdx === 2 ? 'text-[#0284c7]' : (stepIdx > 2 ? 'text-[#181614]' : 'text-[#8c857d]')
                          }`}>
                            Dispatched
                          </span>
                          <span className="text-[10px] sm:text-[9px] text-[#8c857d] block">
                            {stepIdx > 2 ? 'Shipped' : (stepIdx === 2 ? 'In Transit' : 'Pending')}
                          </span>
                        </div>
                      </div>

                      {/* 4. Delivered */}
                      <div className="relative z-10 flex flex-row sm:flex-col items-center sm:text-center gap-3 sm:gap-0 sm:space-y-1.5">
                        {stepIdx === 3 ? (
                          <div className="w-7 h-7 rounded-full bg-[#16a34a] text-white ring-4 ring-[#16a34a]/30 flex items-center justify-center shadow-xs shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-white border-2 border-[#cfc5b6] text-[#8c857d] flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left sm:text-center">
                          <span className={`text-[11px] sm:text-[10px] font-bold uppercase tracking-wider block ${
                            stepIdx === 3 ? 'text-[#166534]' : 'text-[#8c857d]'
                          }`}>
                            Delivered
                          </span>
                          <span className="text-[10px] sm:text-[9px] text-[#8c857d] block">
                            {stepIdx === 3 ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address & Information */}
                  <div className="p-3.5 bg-[#fbf9f5] border border-[#ded5c7] rounded-xs text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#181614]">
                      <MapPin className="w-3.5 h-3.5 text-[#8c562e]" />
                      <span>Destination Address</span>
                    </div>
                    <p className="text-[#6e665e] pl-5">
                      {trackingModalOrder.shippingAddress?.addressLine || 'Client Address'}, {trackingModalOrder.shippingAddress?.city || 'City'}, {trackingModalOrder.shippingAddress?.state || 'State'} - {trackingModalOrder.shippingAddress?.pincode || 'Pincode'}
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-[#f6f2ea] px-6 py-4 border-t border-[#ded5c7] flex justify-between items-center">
                  <button
                    onClick={(e) => handleDownloadInvoice(trackingModalOrder, e)}
                    disabled={downloadingOrderId === trackingModalOrder.id}
                    className="px-4 py-2 bg-white border border-[#181614] hover:bg-[#181614] hover:text-white text-[#181614] text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Invoice</span>
                  </button>
                  <button
                    onClick={() => setIsTrackingModalOpen(false)}
                    className="px-5 py-2 bg-[#181614] hover:bg-[#8c562e] text-white text-xs font-semibold uppercase tracking-widest rounded-xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
};
