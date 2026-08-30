import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Mail, Phone, MapPin, ChevronRight, ArrowLeft, RotateCcw, AlertCircle } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { resetDefaultSEO } from '../utils/seoHelper';

export const CancellationAndRefundScreen: React.FC = () => {
  const { setCurrentScreen } = useShop();

  useEffect(() => {
    resetDefaultSEO('cancellation-and-refund');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-[#fbf8f4] py-12 sm:py-16 text-[#1a1816]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-[#8c857d] mb-8">
          <button 
            onClick={() => {
              setCurrentScreen('home');
              window.location.hash = '/';
            }}
            className="hover:text-[#8c562e] transition-colors cursor-pointer"
          >
            Atelier Home
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#181614] font-medium">Cancellation & Refund Policy</span>
        </nav>

        {/* Header Banner */}
        <div className="border-b border-[#e6ded2] pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#f0e9df] text-[#8c562e] text-[11px] font-bold uppercase tracking-widest rounded-full mb-4">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Returns & Cancellations</span>
          </div>
          <h1 className="font-serif-luxury text-3xl sm:text-4xl md:text-5xl font-semibold text-[#181614] tracking-tight">
            Cancellation & Refund Policy
          </h1>
          <p className="text-sm text-[#736d65] mt-3 font-medium">
            <strong>Effective Date:</strong> 30 August 2026
          </p>
        </div>

        {/* Document Content */}
        <div className="prose prose-stone max-w-none text-[#332f2b] text-sm sm:text-base leading-relaxed space-y-8">
          
          <p className="text-base sm:text-lg text-[#443e39] leading-relaxed">
            This policy explains the conditions under which customers may request cancellation, returns, replacements, or refunds from <strong className="text-[#181614]">STUNNING BIRDS</strong>.
          </p>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">1.</span> Order Cancellation
            </h2>
            <p>
              Customers may request cancellation of an order before the order has been dispatched.
            </p>
            <p>
              Cancellation requests should be submitted as soon as possible and should include the order number.
            </p>
            <p>
              Once an order has been dispatched, cancellation may no longer be possible. In such cases, the customer should contact us regarding the applicable return process.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">2.</span> Cancellation by STUNNING BIRDS
            </h2>
            <p>We may cancel an order in circumstances including:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#443e39]">
              <li>Product becoming unavailable</li>
              <li>Incorrect product or pricing information</li>
              <li>Delivery limitations</li>
              <li>Suspected fraudulent or unauthorised activity</li>
              <li>Technical or system errors</li>
              <li>Other circumstances where fulfilment is not reasonably possible</li>
            </ul>
            <p className="pt-2">
              If payment has already been received for an order cancelled by us, an appropriate refund will be processed.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">3.</span> Damaged, Defective or Incorrect Products
            </h2>
            <p>
              If you receive a product that is damaged, defective, or different from what you ordered, contact us promptly after delivery.
            </p>
            <p>Please provide:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#443e39]">
              <li>Order number</li>
              <li>Description of the issue</li>
              <li>Photographs or videos where reasonably requested</li>
            </ul>
            <p className="pt-2">
              We will review the request and determine the appropriate resolution, which may include replacement, return, or refund depending on the circumstances.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">4.</span> Returns
            </h2>
            <p>
              Returns are subject to product eligibility and condition.
            </p>
            <p>
              Products requested for return should generally be unused and returned in their original condition and packaging, unless the return is due to a damaged, defective, or incorrect product.
            </p>
            <p>
              Certain products may not be eligible for return where applicable.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">5.</span> Refunds
            </h2>
            <p>
              Once a refund is approved, the refund will be initiated through the applicable payment method or process.
            </p>
            <p>
              The time required for the refunded amount to appear in the customer's account may depend on the payment provider, bank, or financial institution.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">6.</span> Refund for Cancelled Orders
            </h2>
            <p>
              If an eligible order is cancelled before dispatch and payment has already been received, the applicable refund will be initiated after the cancellation is confirmed.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">7.</span> Non-Refundable Situations
            </h2>
            <p>A refund or return may not be available where:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#443e39]">
              <li>The customer has damaged the product after delivery</li>
              <li>The product has been materially altered or misused</li>
              <li>The customer cannot provide sufficient information to verify the order</li>
              <li>The request falls outside the applicable return/cancellation conditions</li>
              <li>The product is specifically identified as non-returnable on the product page</li>
            </ul>
            <p className="pt-2 text-xs sm:text-sm text-[#736d65]">
              Nothing in this policy is intended to remove any rights that cannot legally be excluded.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">8.</span> Refund Processing
            </h2>
            <p>
              Refund processing times may vary depending on the original payment method and financial institution.
            </p>
            <p>
              Where applicable, payment refunds are processed through our payment provider, Razorpay.
            </p>
          </section>

          {/* Contact Information Section */}
          <section className="p-6 sm:p-8 bg-[#f5ede2] rounded-xl border border-[#e6ded2] shadow-xs space-y-4">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">9.</span> Contact Us
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-[#443e39] pt-2">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#8c562e] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs uppercase font-semibold tracking-wider text-[#736d65]">Email</p>
                  <a href="mailto:stunningbirds236@gmail.com" className="text-[#8c562e] hover:underline font-medium break-all">
                    stunningbirds236@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-[#8c562e] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs uppercase font-semibold tracking-wider text-[#736d65]">Phone</p>
                  <a href="tel:+918582861387" className="text-[#181614] hover:text-[#8c562e] font-medium">
                    +91 8582861387
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#8c562e] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs uppercase font-semibold tracking-wider text-[#736d65]">Address</p>
                  <p className="font-medium text-[#181614]">
                    6E/1B, Topsia 2nd Lane Kolkata-700039, West Bengal India
                  </p>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Back Link */}
        <div className="mt-12 pt-6 border-t border-[#e6ded2] flex justify-between items-center">
          <button
            onClick={() => {
              setCurrentScreen('home');
              window.location.hash = '/';
            }}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#8c562e] hover:text-[#181614] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Atelier Home</span>
          </button>
        </div>

      </div>
    </div>
  );
};
