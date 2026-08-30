import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Truck, Mail, Phone, MapPin, ChevronRight, ArrowLeft, Clock, ShieldCheck } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { resetDefaultSEO } from '../utils/seoHelper';

export const ShippingPolicyScreen: React.FC = () => {
  const { setCurrentScreen } = useShop();

  useEffect(() => {
    resetDefaultSEO('shipping-policy');
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
          <span className="text-[#181614] font-medium">Shipping Policy</span>
        </nav>

        {/* Header Banner */}
        <div className="border-b border-[#e6ded2] pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#f0e9df] text-[#8c562e] text-[11px] font-bold uppercase tracking-widest rounded-full mb-4">
            <Truck className="w-3.5 h-3.5" />
            <span>Fulfillment & Dispatch</span>
          </div>
          <h1 className="font-serif-luxury text-3xl sm:text-4xl md:text-5xl font-semibold text-[#181614] tracking-tight">
            Shipping Policy
          </h1>
          <p className="text-sm text-[#736d65] mt-3 font-medium">
            <strong>Effective Date:</strong> 30 August 2026
          </p>
        </div>

        {/* Document Content */}
        <div className="prose prose-stone max-w-none text-[#332f2b] text-sm sm:text-base leading-relaxed space-y-8">
          
          <p className="text-base sm:text-lg text-[#443e39] leading-relaxed">
            This Shipping Policy explains how <strong className="text-[#181614]">STUNNING BIRDS</strong> processes and delivers customer orders.
          </p>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">1.</span> Order Processing
            </h2>
            <p>
              Orders are normally processed after successful order confirmation and payment.
            </p>
            <p>
              Processing times may vary depending on product availability, order volume, weekends, public holidays, or other circumstances.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">2.</span> Delivery Time
            </h2>
            <p>
              Estimated delivery dates displayed on the website are estimates and are not guaranteed delivery dates.
            </p>
            <p>
              Delivery times may vary depending on the customer's location, courier availability, weather, public holidays, and other circumstances beyond our reasonable control.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">3.</span> Shipping Charges
            </h2>
            <p>
              Applicable shipping charges, if any, will be displayed during checkout before the order is placed.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">4.</span> Delivery Address
            </h2>
            <p>
              Customers are responsible for providing a complete and accurate delivery address, phone number, and other required delivery information.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">5.</span> Courier Delays
            </h2>
            <p>
              STUNNING BIRDS is not responsible for delays caused by circumstances outside our reasonable control, including courier disruptions, severe weather, natural disasters, public holidays, transportation interruptions, or other unforeseen events.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">6.</span> Failed Delivery
            </h2>
            <p>
              If a courier attempts delivery but the customer is unavailable or the address cannot be verified, the courier may make additional delivery attempts according to its procedures.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">7.</span> Damaged or Incorrect Orders
            </h2>
            <p>
              If you receive a damaged, defective, or incorrect product, please contact us as soon as reasonably possible after delivery.
            </p>
            <p>
              Please provide your order number and relevant photographs or other information requested by our customer-support team.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">8.</span> Order Tracking
            </h2>
            <p>
              Where tracking information is available, it may be provided to the customer through the contact information associated with the order.
            </p>
          </section>

          {/* Contact Information Section */}
          <section className="p-6 sm:p-8 bg-[#f5ede2] rounded-xl border border-[#e6ded2] shadow-xs space-y-4">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">9.</span> Contact
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
