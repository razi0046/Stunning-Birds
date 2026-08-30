import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Package, ArrowRight, Truck, Sparkles } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { formatINR } from '../utils/formatCurrency';

export const OrderSuccessScreen: React.FC = () => {
  const { latestPlacedOrder, setCurrentScreen } = useShop();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 lg:py-24 text-center space-y-8">
      
      {/* Icon & Heading with Spring Entrance */}
      <div className="space-y-4">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="mx-auto w-20 h-20 rounded-full bg-[#f6f2ea] border-2 border-[#8c562e] flex items-center justify-center text-[#8c562e] shadow-md"
        >
          <CheckCircle2 className="w-10 h-10" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#181614] text-[#d4af37] rounded-full text-[10px] font-bold tracking-widest uppercase shadow-xs">
            <Sparkles className="w-3 h-3" />
            <span>Commission Confirmed</span>
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="font-serif-luxury text-3xl sm:text-5xl font-bold text-[#181614] tracking-tight"
        >
          Thank You For Showing Your Presence
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-sm sm:text-base text-[#696159] max-w-lg mx-auto leading-relaxed"
        >
          Your bespoke leather goods piece has been dispatched to our master artisan. You will receive progress notifications as it moves through the atelier.
        </motion.p>
      </div>

      {/* Order Reference Box */}
      {latestPlacedOrder && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="bg-[#f6f2ea] border border-[#e4d9cb] rounded-xs p-6 text-left max-w-md mx-auto space-y-3 shadow-xs"
        >
          <div className="flex justify-between items-center text-xs pb-3 border-b border-[#ded3c2]">
            <span className="text-[#8c857d] uppercase tracking-wider">Commission ID</span>
            <span className="font-mono font-bold text-[#181614]">{latestPlacedOrder.id}</span>
          </div>

          <div className="flex justify-between items-center text-xs pb-3 border-b border-[#ded3c2]">
            <span className="text-[#8c857d] uppercase tracking-wider">Payment Status</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#15803d] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#15803d]" />
              {latestPlacedOrder.paymentStatus === 'Paid' ? 'Paid & Verified' : latestPlacedOrder.paymentStatus}
            </span>
          </div>

          {latestPlacedOrder.razorpayPaymentId && (
            <div className="flex justify-between items-center text-xs pb-3 border-b border-[#ded3c2]">
              <span className="text-[#8c857d] uppercase tracking-wider">Razorpay Ref</span>
              <span className="font-mono text-[11px] text-[#524941]">{latestPlacedOrder.razorpayPaymentId}</span>
            </div>
          )}

          {latestPlacedOrder.couponCode && (
            <div className="flex justify-between items-center text-xs pb-3 border-b border-[#ded3c2]">
              <span className="text-[#8c857d] uppercase tracking-wider">Privilege Coupon</span>
              <span className="font-mono font-bold text-[#15803d]">
                {latestPlacedOrder.couponCode} (-{formatINR(latestPlacedOrder.discountAmount || 0)})
              </span>
            </div>
          )}

          <div className="flex justify-between items-center text-xs pb-3 border-b border-[#ded3c2]">
            <span className="text-[#8c857d] uppercase tracking-wider">Amount</span>
            <span className="font-serif-luxury font-bold text-sm text-[#181614]">
              {formatINR(latestPlacedOrder.total)}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-[#8c857d] uppercase tracking-wider">Courier Destination</span>
            <span className="font-medium text-[#181614]">{latestPlacedOrder.shippingAddress?.city || 'City'}, {latestPlacedOrder.shippingAddress?.state || 'State'}</span>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
      >
        <motion.button
          id="view-live-tracker-btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setCurrentScreen('account');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="w-full sm:w-auto px-8 py-3.5 bg-[#8c562e] hover:bg-[#734320] text-white text-xs font-semibold uppercase tracking-[0.2em] transition-colors shadow-md flex items-center justify-center gap-2 group cursor-pointer"
        >
          <span>Track Commission Progress</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setCurrentScreen('shop');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="w-full sm:w-auto px-8 py-3.5 bg-white border border-[#ded5c7] hover:border-[#181614] text-[#181614] text-xs font-semibold uppercase tracking-[0.2em] transition-colors cursor-pointer shadow-2xs"
        >
          Continue Exploring
        </motion.button>
      </motion.div>

    </div>
  );
};
