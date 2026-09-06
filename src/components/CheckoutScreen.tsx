import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ShieldCheck, Check, CreditCard, Smartphone, Banknote, ArrowRight, Truck, AlertCircle, RefreshCw, Tag, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { PaymentMethodType } from '../types';
import { formatINR } from '../utils/formatCurrency';
import { launchRazorpayCheckout, validateCouponCode } from '../services/razorpayService';

export const CheckoutScreen: React.FC = () => {
  const {
    cart,
    cartTotal,
    placeOrder,
    createVerifiedOrder,
    setCurrentScreen,
    userProfile,
    isLoggedIn,
    openAuthModal,
    showToast,
  } = useShop();

  const [contactEmail, setContactEmail] = useState(userProfile.email || '');
  const [phoneNumber, setPhoneNumber] = useState(userProfile.phone ? userProfile.phone.replace(/\D/g, '') : '');
  const [pincode] = useState(userProfile.addresses?.[0]?.pincode || '700039');
  const [completeAddress, setCompleteAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [shippingMethod, setShippingMethod] = useState('Complimentary Express Courier (2-4 Days) · ₹0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Razorpay');
  
  // Card input fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState(userProfile.name || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPercentage: number;
    discountAmount: number;
    message?: string;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Calculate pricing dynamically based on current cartTotal and applied coupon
  const subtotal = cartTotal;
  const discountPercentage = appliedCoupon ? appliedCoupon.discountPercentage : 0;
  const discountAmount = appliedCoupon ? Math.round(subtotal * (discountPercentage / 100)) : 0;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const shippingCost = 0;
  const taxes = Math.round(discountedSubtotal * 0.18);
  const total = discountedSubtotal + shippingCost + taxes;
  const undiscountedTotal = subtotal + shippingCost + Math.round(subtotal * 0.18);

  // Handle Coupon Apply
  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = couponInput.trim().toUpperCase();
    
    if (!cleanCode) {
      setCouponError('Please enter a coupon code.');
      setCouponSuccess(null);
      return;
    }

    if (appliedCoupon && appliedCoupon.code === cleanCode) {
      setCouponError(`Coupon ${cleanCode} is already applied to this checkout.`);
      setCouponSuccess(null);
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError(null);
    setCouponSuccess(null);

    try {
      const emailToCheck = contactEmail.trim() || userProfile.email;
      const result = await validateCouponCode({
        couponCode: cleanCode,
        subtotal,
        customerEmail: emailToCheck,
        userId: userProfile.id,
      });

      if (result.valid) {
        setAppliedCoupon({
          code: result.code || cleanCode,
          discountPercentage: result.discountPercentage || 10,
          discountAmount: result.discountAmount || Math.round(subtotal * 0.10),
          message: result.message,
        });
        setCouponSuccess(result.message || `Coupon ${result.code || cleanCode} applied: 10% discount!`);
        setCouponError(null);
        showToast(`Coupon ${result.code || cleanCode} applied successfully!`);
      } else {
        setAppliedCoupon(null);
        setCouponError(result.message || 'NEW10 is valid only for your first order.');
        setCouponSuccess(null);
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err.message || 'Failed to validate coupon code. Please try again.');
      setCouponSuccess(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Handle Coupon Remove
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    setCouponSuccess(null);
    setCouponInput('');
    showToast('Coupon removed');
  };

  const handlePlaceOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isLoggedIn) {
      openAuthModal('login', undefined, 'Please sign in to place your bespoke commission');
      return;
    }

    const cleanPhone = phoneNumber.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setPaymentError('Please enter a valid numeric phone number (at least 10 digits).');
      return;
    }

    const cleanAddress = completeAddress.trim();
    if (!cleanAddress || cleanAddress.length < 5) {
      setPaymentError('Please enter your complete delivery address.');
      return;
    }

    const cleanCity = city.trim();
    if (!cleanCity || !/^[a-zA-Z\s.'-]+$/.test(cleanCity) || cleanCity.length < 2) {
      setPaymentError('Please enter a valid city name (letters only).');
      return;
    }

    const cleanState = stateVal.trim();
    if (!cleanState || !/^[a-zA-Z\s.'-]+$/.test(cleanState) || cleanState.length < 2) {
      setPaymentError('Please enter a valid state name (letters only).');
      return;
    }

    setIsSubmitting(true);
    setPaymentError(null);
    setPaymentNotice(null);

    const customerDetails = {
      name: userProfile.name || cardName || 'Valued Patron',
      email: contactEmail || userProfile.email || 'patron@example.com',
      avatarInitials: userProfile.avatarInitials || (userProfile.name || 'VP').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'VP',
    };

    const shippingAddressDetails = {
      phone: cleanPhone,
      pincode: pincode || userProfile.addresses?.[0]?.pincode || '700039',
      landmark: '',
      city: cleanCity,
      state: cleanState,
      addressLine: cleanAddress,
    };

    // 1. Cash on Delivery Flow
    if (paymentMethod === 'Cash on Delivery (COD)') {
      try {
        await placeOrder({
          customer: customerDetails,
          shippingAddress: shippingAddressDetails,
          paymentMethod: 'Cash on Delivery (COD)',
          shippingMethod,
          subtotal,
          discountAmount,
          discount_amount: discountAmount,
          couponCode: appliedCoupon?.code,
          coupon_code: appliedCoupon?.code,
          discountPercentage: appliedCoupon ? appliedCoupon.discountPercentage : undefined,
          taxes,
          total,
        });

        setIsSubmitting(false);
        setCurrentScreen('order-success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        setIsSubmitting(false);
        setPaymentError('Order commission could not be placed. Please try again.');
      }
      return;
    }

    // 2. Razorpay Payment Flow (Online / Cards / UPI / NetBanking)
    try {
      // Step A: Launch Razorpay Checkout directly with server-side validation of subtotal and coupon
      await launchRazorpayCheckout({
        amount: total,
        subtotal: subtotal,
        couponCode: appliedCoupon?.code,
        customerName: customerDetails.name,
        customerEmail: customerDetails.email,
        customerPhone: cleanPhone,
        preferredMethod: paymentMethod,
        notes: {
          shipping_address: cleanAddress,
          shipping_city: cleanCity,
          shipping_state: cleanState,
          shipping_pincode: pincode || userProfile.addresses?.[0]?.pincode || '700039',
          items_count: String(cart.length),
          ...(appliedCoupon ? { coupon_code: appliedCoupon.code, discount_amount: String(discountAmount) } : {}),
        },
        onSuccess: async (result) => {
          try {
            // Step B: Cryptographic verification on server succeeded; create the Supabase orders & order_items record now
            await createVerifiedOrder(
              {
                customer: customerDetails,
                shippingAddress: shippingAddressDetails,
                paymentMethod: paymentMethod,
                shippingMethod,
                subtotal,
                discountAmount,
                discount_amount: discountAmount,
                couponCode: appliedCoupon?.code,
                coupon_code: appliedCoupon?.code,
                discountPercentage: appliedCoupon ? appliedCoupon.discountPercentage : undefined,
                taxes,
                total,
              },
              {
                razorpayOrderId: result.razorpay_order_id,
                razorpayPaymentId: result.razorpay_payment_id,
                razorpaySignature: result.razorpay_signature,
              }
            );

            setIsSubmitting(false);
            setCurrentScreen('order-success');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (createErr: any) {
            console.error('Error creating verified order in database:', createErr);
            setIsSubmitting(false);
            setPaymentError('Payment was captured successfully (' + result.razorpay_payment_id + '), but saving your order record met an unexpected issue. Please contact atelier concierge.');
          }
        },
        onError: (error: any) => {
          // On Payment Failure or Cancel: DO NOT insert anything into Supabase or orders state.
          setIsSubmitting(false);
          const rawMsg = error?.description || error?.message || '';
          let friendlyMsg = rawMsg;
          if (
            !rawMsg ||
            rawMsg.toLowerCase().includes('bank') ||
            rawMsg.toLowerCase().includes('declined') ||
            rawMsg.toLowerCase().includes('another method') ||
            rawMsg.toLowerCase().includes('popup') ||
            rawMsg.toLowerCase().includes('cancelled') ||
            rawMsg.toLowerCase().includes('failed')
          ) {
            friendlyMsg = 'Payment could not be completed with this bank method. Please try UPI, card, or another bank.';
          }
          setPaymentError(friendlyMsg + ' Your cart and applied discounts have been retained.');
        },
        onDismiss: () => {
          // On Checkout Dismiss: DO NOT insert anything into Supabase. Keep customer on checkout.
          setIsSubmitting(false);
          setPaymentNotice('Payment checkout closed. No charge was made and your bag is ready whenever you are.');
        },
      });
    } catch (err: any) {
      setIsSubmitting(false);
      setPaymentError(err.message || 'Payment checkout initialization failed. Please try again.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      
      {/* Checkout Minimal Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between pb-6 border-b border-[#ece4d8] mb-8"
      >
        <button
          onClick={() => setCurrentScreen('home')}
          className="font-serif-luxury text-xl sm:text-2xl tracking-[0.2em] font-semibold text-[#181614] uppercase hover:text-[#8c562e] transition-colors cursor-pointer"
        >
          STUNNING BIRDS
        </button>

        <div className="flex items-center gap-1.5 text-xs text-[#78716c]">
          <Lock className="w-3.5 h-3.5 text-[#8c562e]" />
          <span>Secure Razorpay Atelier Checkout</span>
        </div>
      </motion.div>

      {/* Progress Breadcrumbs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex items-center space-x-2 text-xs text-[#8c857d] mb-10 overflow-x-auto pb-2"
      >
        <span className="text-[#181614] font-medium">1 Information</span>
        <span>›</span>
        <span className="text-[#181614] font-medium">2 Shipping</span>
        <span>›</span>
        <span className="text-[#8c562e] font-bold">3 Payment</span>
        <span>›</span>
        <span>4 Confirmation</span>
      </motion.div>

      {/* Payment Error / Cancellation Alert Banner */}
      <AnimatePresence>
        {paymentError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-[#fef2f2] border border-[#fecaca] rounded-xs flex items-start justify-between gap-3 text-xs text-[#991b1b]"
          >
            <div className="flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Payment Incomplete</strong>
                <span>{paymentError}</span>
              </div>
            </div>
            <button
              onClick={() => setPaymentError(null)}
              className="text-[#dc2626] hover:text-[#991b1b] font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}

        {paymentNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-[#fffbeb] border border-[#fef3c7] rounded-xs flex items-start justify-between gap-3 text-xs text-[#92400e]"
          >
            <div className="flex items-start space-x-2.5">
              <RefreshCw className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Checkout Paused</strong>
                <span>{paymentNotice}</span>
              </div>
            </div>
            <button
              onClick={() => setPaymentNotice(null)}
              className="text-[#d97706] hover:text-[#92400e] font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Form Left, Order Summary Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        
        {/* Left Column: Information, Shipping & Payment Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          onSubmit={handlePlaceOrder}
          className="lg:col-span-7 space-y-8"
        >
          {/* Client Authentication Status Banner */}
          {isLoggedIn ? (
            <div className="p-3.5 bg-[#f5f0e6] border border-[#e2d6c3] rounded-xs flex items-center justify-between text-xs text-[#524941]">
              <div className="flex items-center space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-[#15803d]" />
                <span>
                  Signed in as <strong>{userProfile.name}</strong> ({userProfile.email})
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#8c562e] uppercase tracking-wider">
                {userProfile.tier}
              </span>
            </div>
          ) : (
            <div className="p-4 bg-[#fcf8f2] border border-[#eddccb] rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#6e6052]">
              <div>
                <span className="font-semibold text-[#181614] block">Already an Atelier Patron?</span>
                <span className="text-[11px] text-[#78716c]">Sign in to apply member benefits and track your bespoke piece.</span>
              </div>
              <button
                type="button"
                onClick={() => openAuthModal('login', undefined, 'Sign in to access your client benefits')}
                className="px-4 py-2 bg-[#181614] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#8c562e] transition-colors rounded-xs cursor-pointer shrink-0"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Section 1: Contact */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block">
              Contact Email
            </label>
            <input
              id="checkout-email"
              type="email"
              required
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="jane.doe@example.com"
              className="w-full bg-white border border-[#ded5c7] px-4 py-3 text-sm text-[#181614] focus:outline-none focus:border-[#8c562e] rounded-xs shadow-2xs transition-colors"
            />
          </div>

          {/* Section 2: Ship To */}
          <div className="space-y-4 pt-4 border-t border-[#ece4d8]">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block">
              Shipping Address
            </label>

            <div>
              <input
                id="checkout-phone"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={15}
                required
                value={phoneNumber}
                onChange={e => {
                  const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 15);
                  setPhoneNumber(numericOnly);
                }}
                onKeyDown={e => {
                  if (
                    !/[0-9]/.test(e.key) &&
                    !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) &&
                    !e.ctrlKey &&
                    !e.metaKey
                  ) {
                    e.preventDefault();
                  }
                }}
                placeholder="Phone Number (Digits only, min 10 digits) *"
                className="w-full bg-white border border-[#ded5c7] px-4 py-3 text-sm text-[#181614] focus:outline-none focus:border-[#8c562e] rounded-xs shadow-2xs transition-colors"
              />
            </div>

            <div>
              <textarea
                id="checkout-complete-address"
                required
                rows={3}
                value={completeAddress}
                onChange={e => setCompleteAddress(e.target.value)}
                placeholder="Complete Delivery Address (House/Flat No., Building, Street, Area) *"
                className="w-full bg-white border border-[#ded5c7] px-4 py-3 text-sm text-[#181614] focus:outline-none focus:border-[#8c562e] rounded-xs shadow-2xs transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <input
                  id="checkout-city"
                  type="text"
                  required
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="City *"
                  className="w-full bg-white border border-[#ded5c7] px-4 py-3 text-sm text-[#181614] focus:outline-none focus:border-[#8c562e] rounded-xs shadow-2xs transition-colors"
                />
              </div>
              <div>
                <input
                  id="checkout-state"
                  type="text"
                  required
                  value={stateVal}
                  onChange={e => setStateVal(e.target.value)}
                  placeholder="State *"
                  className="w-full bg-white border border-[#ded5c7] px-4 py-3 text-sm text-[#181614] focus:outline-none focus:border-[#8c562e] rounded-xs shadow-2xs transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Shipping Method */}
          <div className="space-y-3 pt-4 border-t border-[#ece4d8]">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block">
              Method
            </label>
            <div className="p-4 bg-white border border-[#ded5c7] rounded-xs flex items-center justify-between text-sm shadow-2xs">
              <div className="flex items-center space-x-3">
                <Truck className="w-4 h-4 text-[#8c562e]" />
                <span className="text-[#181614] font-medium">{shippingMethod}</span>
              </div>
              <span className="font-semibold text-[#15803d]">FREE</span>
            </div>
          </div>

          {/* Section 4: Payment */}
          <div className="space-y-4 pt-4 border-t border-[#ece4d8]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif-luxury text-2xl font-semibold text-[#181614]">
                  Payment
                </h3>
                <p className="text-xs text-[#78716c]">
                  Encrypted & verified via 256-bit SSL Razorpay Secure.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-[#f5ede4] text-[#8c562e] border border-[#e2d3c3] text-[10px] font-bold rounded-xs uppercase tracking-wider">
                Razorpay Secure
              </span>
            </div>

            {/* Payment Options Accordion/Card */}
            <div className="border border-[#ded5c7] rounded-xs overflow-hidden bg-white shadow-2xs divide-y divide-[#ded5c7]">
              
              {/* Option 1: Razorpay All-in-one */}
              <div className={`p-4 transition-colors ${paymentMethod === 'Razorpay' ? 'bg-[#fcfaf7]' : ''}`}>
                <label
                  onClick={() => setPaymentMethod('Razorpay')}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      paymentMethod === 'Razorpay' ? 'border-[#8c562e]' : 'border-[#cfc5b6]'
                    }`}>
                      {paymentMethod === 'Razorpay' && (
                        <div className="w-2 h-2 rounded-full bg-[#8c562e]" />
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-[#181614] block">Razorpay Secure Checkout</span>
                      <span className="text-[11px] text-[#78716c]">UPI, Credit/Debit Cards, Net Banking & Wallets</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#8c857d]" />
                    <Smartphone className="w-4 h-4 text-[#8c857d]" />
                  </div>
                </label>
              </div>

              {/* Option 2: Debit / Credit Card */}
              <div className={`p-4 transition-colors ${paymentMethod === 'Debit Card' ? 'bg-[#fcfaf7]' : ''}`}>
                <label
                  onClick={() => setPaymentMethod('Debit Card')}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      paymentMethod === 'Debit Card' ? 'border-[#8c562e]' : 'border-[#cfc5b6]'
                    }`}>
                      {paymentMethod === 'Debit Card' && (
                        <div className="w-2 h-2 rounded-full bg-[#8c562e]" />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-[#181614]">Debit / Credit Card (via Razorpay)</span>
                  </div>
                  <CreditCard className="w-5 h-5 text-[#8c857d]" />
                </label>
              </div>

              {/* Option 3: UPI */}
              <div className={`p-4 transition-colors ${paymentMethod === 'UPI' ? 'bg-[#fcfaf7]' : ''}`}>
                <label
                  onClick={() => setPaymentMethod('UPI')}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      paymentMethod === 'UPI' ? 'border-[#8c562e]' : 'border-[#cfc5b6]'
                    }`}>
                      {paymentMethod === 'UPI' && (
                        <div className="w-2 h-2 rounded-full bg-[#8c562e]" />
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-[#181614] block">UPI / Instant QR (via Razorpay)</span>
                      <span className="text-[11px] text-[#78716c]">Google Pay, PhonePe, Paytm, BHIM & UPI QR</span>
                    </div>
                  </div>
                  <Smartphone className="w-5 h-5 text-[#8c857d]" />
                </label>
              </div>

              {/* Option 4: Cash on Delivery */}
              <div className={`p-4 transition-colors ${paymentMethod === 'Cash on Delivery (COD)' ? 'bg-[#fcfaf7]' : ''}`}>
                <label
                  onClick={() => setPaymentMethod('Cash on Delivery (COD)')}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      paymentMethod === 'Cash on Delivery (COD)' ? 'border-[#8c562e]' : 'border-[#cfc5b6]'
                    }`}>
                      {paymentMethod === 'Cash on Delivery (COD)' && (
                        <div className="w-2 h-2 rounded-full bg-[#8c562e]" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-[#181614]">Cash on Delivery (COD)</span>
                  </div>
                  <Banknote className="w-5 h-5 text-[#8c857d]" />
                </label>
              </div>

            </div>
          </div>

          {/* Section 5: Billing Address */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#181614]">
              Billing Address
            </h4>
            <label
              onClick={() => setSameAsBilling(!sameAsBilling)}
              className="flex items-center space-x-3 text-xs text-[#4a433c] cursor-pointer select-none"
            >
              <div className={`w-4 h-4 rounded-xs border flex items-center justify-center transition-colors ${
                sameAsBilling ? 'bg-[#8c562e] border-[#8c562e] text-white shadow-2xs' : 'border-[#cfc5b6]'
              }`}>
                {sameAsBilling && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span>Same as shipping address</span>
            </label>
          </div>

          {/* Mobile Submit trigger */}
          <div className="block lg:hidden">
            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitting}
              className="w-full py-4 bg-[#8c562e] hover:bg-[#734320] text-white text-xs font-semibold uppercase tracking-[0.2em] transition-colors shadow-md cursor-pointer disabled:opacity-60"
            >
              {isSubmitting
                ? 'Connecting to Razorpay...'
                : paymentMethod === 'Cash on Delivery (COD)'
                ? `Place Order (COD) · ${formatINR(total)}`
                : `Pay Now · ${formatINR(total)}`}
            </motion.button>
          </div>

        </motion.form>

        {/* Right Column: Order Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 bg-[#f6f2ea] border border-[#e4d9cb] rounded-xs p-6 sm:p-8 space-y-6 sticky top-28 shadow-xs"
        >
          
          <h2 className="font-serif-luxury text-2xl font-semibold text-[#181614] border-b border-[#ded3c2] pb-4">
            Order Summary
          </h2>

          {/* Items List */}
          <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
            {cart.length > 0 ? (
              cart.map(item => (
                <div key={item.id} className="flex space-x-4 items-center">
                  <div className="relative">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-18 object-cover rounded-xs border border-[#ded3c2] bg-white"
                    />
                    <span className="absolute -top-1.5 -right-1.5 bg-[#8c562e] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif-luxury text-sm font-semibold text-[#181614] truncate">
                      {item.product.name}
                    </h4>
                    <p className="text-xs text-[#78716c] truncate">
                      {item.selectedColor || item.product.colorName} {item.monogram ? `• [${item.monogram}]` : ''}
                    </p>
                  </div>
                  <span className="font-serif-luxury text-sm font-semibold text-[#181614]">
                    {formatINR(item.product.price * item.quantity)}
                  </span>
                </div>
              ))
            ) : (
              // Default preview items
              <>
                <div className="flex space-x-4 items-center">
                  <div className="relative">
                    <img
                      src="https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80"
                      alt="Heritage Bifold Wallet"
                      referrerPolicy="no-referrer"
                      className="w-16 h-18 object-cover rounded-xs border border-[#ded3c2] bg-white"
                    />
                    <span className="absolute -top-1.5 -right-1.5 bg-[#8c562e] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      1
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif-luxury text-sm font-semibold text-[#181614] truncate">
                      Heritage Bifold Wallet
                    </h4>
                    <p className="text-xs text-[#78716c] truncate">Espresso Calfskin</p>
                  </div>
                  <span className="font-serif-luxury text-sm font-semibold text-[#181614]">{formatINR(14990)}</span>
                </div>
              </>
            )}
          </div>

          {/* Coupon Code Section */}
          <div className="border-t border-[#ded3c2] pt-4 space-y-2">
            <label htmlFor="coupon-code-input" className="block text-xs font-semibold uppercase tracking-wider text-[#181614]">
              Privilege / Coupon Code
            </label>

            {!appliedCoupon ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-[#8c857d] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="coupon-code-input"
                      type="text"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        if (couponError) setCouponError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      placeholder="Enter code (e.g. NEW10)"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#ded5c7] text-xs font-mono uppercase text-[#181614] placeholder-[#a8a096] rounded-xs focus:outline-none focus:border-[#8c562e] transition-colors"
                    />
                  </div>
                  <button
                    id="apply-coupon-btn"
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    disabled={isValidatingCoupon || !couponInput.trim()}
                    className="px-4 py-2.5 bg-[#8c562e] hover:bg-[#734320] text-white text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 flex items-center justify-center min-w-[76px]"
                  >
                    {isValidatingCoupon ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      'Apply'
                    )}
                  </button>
                </div>

                {/* Suggested Tip */}
                <div className="flex items-center justify-between text-[11px] text-[#78716c] pt-0.5">
                  <span className="flex items-center gap-1 text-[#8c562e] font-medium">
                    <Sparkles className="w-3 h-3" />
                    First order? Use code <code className="font-mono font-bold bg-[#efe7db] px-1 py-0.5 rounded text-[#70421d]">NEW10</code> for 10% off
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[#eaf5ec] border border-[#bbf7d0] rounded-xs p-3 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#15803d] text-white flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#15803d] tracking-wider">
                        {appliedCoupon.code}
                      </span>
                      <span className="bg-[#15803d] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-xs uppercase tracking-wider">
                        10% OFF
                      </span>
                    </div>
                    <span className="text-[11px] text-[#166534]">
                      First order privilege applied · You save {formatINR(discountAmount)}
                    </span>
                  </div>
                </div>
                <button
                  id="remove-coupon-btn"
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-[#991b1b] hover:text-[#7f1d1d] hover:bg-[#fee2e2] p-1.5 rounded-xs text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Remove Coupon"
                >
                  <X className="w-4 h-4" />
                  <span className="text-[11px] uppercase tracking-wider">Remove</span>
                </button>
              </div>
            )}

            {/* Feedback Alerts */}
            <AnimatePresence>
              {couponError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-2.5 bg-[#fef2f2] border border-[#fecaca] rounded-xs flex items-start gap-2 text-xs text-[#991b1b]"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="flex-1 font-medium">{couponError}</span>
                </motion.div>
              )}
              {couponSuccess && !couponError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-2.5 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xs flex items-start gap-2 text-xs text-[#166534]"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#15803d]" />
                  <span className="flex-1 font-medium">{couponSuccess}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pricing breakdown */}
          <div className="border-t border-[#ded3c2] pt-4 space-y-2.5 text-xs">
            <div className="flex justify-between text-[#6e665e]">
              <span>Original Amount</span>
              <span className="font-medium text-[#181614]">{formatINR(subtotal)}</span>
            </div>

            {appliedCoupon && (
              <>
                <div className="flex justify-between items-center text-[#15803d] font-semibold bg-[#eef7f0] px-2 py-1.5 rounded-xs border border-[#d1ebd6]">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Coupon: {appliedCoupon.code}</span>
                  </div>
                  <span className="font-mono text-xs uppercase bg-[#15803d] text-white px-1.5 py-0.5 rounded-xs">
                    Applied
                  </span>
                </div>
                <div className="flex justify-between text-[#15803d] font-semibold px-0.5">
                  <span>Discount: {appliedCoupon.discountPercentage}%</span>
                  <span>-{formatINR(discountAmount)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between text-[#6e665e]">
              <span>Shipping</span>
              <span className="font-medium text-[#15803d]">FREE</span>
            </div>
            <div className="flex justify-between text-[#6e665e]">
              <span>GST (18% Estimated)</span>
              <span className="font-medium text-[#181614]">{formatINR(taxes)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-3 border-t border-[#ded3c2]">
              <div>
                <span className="font-serif-luxury text-base font-bold text-[#181614] block">Final Amount</span>
                {appliedCoupon && (
                  <span className="text-[11px] text-[#15803d] font-medium">10% First-Order Privilege Applied</span>
                )}
              </div>
              <div className="flex items-baseline space-x-2">
                {appliedCoupon && (
                  <span className="text-sm line-through text-[#a8a096]">
                    {formatINR(undiscountedTotal)}
                  </span>
                )}
                <span className="font-serif-luxury text-2xl font-bold text-[#181614]">
                  {formatINR(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Place Order / Pay Now CTA Button */}
          <motion.button
            id="checkout-place-order-btn"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePlaceOrder()}
            disabled={isSubmitting}
            className="w-full py-4 bg-[#8c562e] hover:bg-[#734320] text-white text-xs font-semibold uppercase tracking-[0.2em] transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2 group disabled:opacity-60"
          >
            <span>
              {isSubmitting
                ? 'Securing Commission...'
                : paymentMethod === 'Cash on Delivery (COD)'
                ? `Place Order (COD) · ${formatINR(total)}`
                : `Pay Now · ${formatINR(total)}`}
            </span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#78716c]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#8c562e]" />
            <span>Secure 256-Bit SSL Razorpay Encryption</span>
          </div>

        </motion.div>

      </div>

    </div>
  );
};

