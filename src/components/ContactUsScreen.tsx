import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Clock, ShieldAlert, ChevronRight, ArrowLeft, Headphones, MessageSquare } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { resetDefaultSEO } from '../utils/seoHelper';

export const ContactUsScreen: React.FC = () => {
  const { setCurrentScreen } = useShop();

  useEffect(() => {
    resetDefaultSEO('contact-us');
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
          <span className="text-[#181614] font-medium">Contact Us</span>
        </nav>

        {/* Header Banner */}
        <div className="border-b border-[#e6ded2] pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#f0e9df] text-[#8c562e] text-[11px] font-bold uppercase tracking-widest rounded-full mb-4">
            <Headphones className="w-3.5 h-3.5" />
            <span>Patron Support & Atelier Assistance</span>
          </div>
          <h1 className="font-serif-luxury text-3xl sm:text-4xl md:text-5xl font-semibold text-[#181614] tracking-tight">
            Contact Us
          </h1>
          <p className="text-base sm:text-lg text-[#554e47] mt-3 max-w-2xl leading-relaxed">
            We are here to help with questions about products, orders, payments, shipping, returns, cancellations, and other website-related enquiries.
          </p>
        </div>

        {/* Support Grid & Details */}
        <div className="space-y-8 text-[#332f2b]">
          
          {/* Customer Support Card */}
          <section className="p-6 sm:p-8 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#f0eae0] pb-4">
              <h2 className="text-xl sm:text-2xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#8c562e]" />
                <span>Customer Support</span>
              </h2>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8c562e] bg-[#f7f2ea] px-2.5 py-1 rounded-md">
                STUNNING BIRDS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex items-start gap-3.5 p-4 rounded-lg bg-[#faf7f2] border border-[#ede6dc]">
                <Mail className="w-5 h-5 text-[#8c562e] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs uppercase font-semibold tracking-wider text-[#736d65]">Email</p>
                  <a 
                    href="mailto:stunningbirds236@gmail.com" 
                    className="text-base font-semibold text-[#8c562e] hover:underline break-all block mt-0.5"
                  >
                    stunningbirds236@gmail.com
                  </a>
                  <p className="text-xs text-[#736d65] mt-1">Official customer inquiries & requests</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-lg bg-[#faf7f2] border border-[#ede6dc]">
                <Phone className="w-5 h-5 text-[#8c562e] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs uppercase font-semibold tracking-wider text-[#736d65]">Phone</p>
                  <a 
                    href="tel:+918582861387" 
                    className="text-base font-semibold text-[#181614] hover:text-[#8c562e] block mt-0.5"
                  >
                    +91 8582861387
                  </a>
                  <p className="text-xs text-[#736d65] mt-1">Direct patron helpline</p>
                </div>
              </div>

            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-lg bg-[#faf7f2] border border-[#ede6dc]">
              <MapPin className="w-5 h-5 text-[#8c562e] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs uppercase font-semibold tracking-wider text-[#736d65]">Business Address</p>
                <p className="font-semibold text-[#181614] text-sm sm:text-base">
                  6E/1B, Topsia 2nd Lane Kolkata-700039,West Bengal India
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-xs sm:text-sm text-[#554e47]">
                  <span><strong>City:</strong> Kolkata</span>
                  <span><strong>State:</strong> West Bengal, India</span>
                  <span><strong>PIN:</strong> 700039</span>
                </div>
              </div>
            </div>
          </section>

          {/* Support Hours Card */}
          <section className="p-6 sm:p-8 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-4">
            <h2 className="text-xl sm:text-2xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#8c562e]" />
              <span>Support Hours</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-2">
              <div className="p-3.5 bg-[#faf7f2] rounded-lg border border-[#ede6dc] flex justify-between items-center">
                <span className="font-medium text-[#181614]">Monday – Saturday</span>
                <span className="text-[#8c562e] font-semibold">10:00 a.m. – 9:00 p.m.</span>
              </div>
              <div className="p-3.5 bg-[#faf7f2] rounded-lg border border-[#ede6dc] flex justify-between items-center">
                <span className="font-medium text-[#181614]">Sunday</span>
                <span className="text-[#a83232] font-semibold">CLOSED</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[#736d65] pt-1">
              We aim to respond to customer enquiries as soon as reasonably possible.
            </p>
          </section>

          {/* Order Support & Payment Support Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
              <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614]">
                Order Support
              </h2>
              <p className="text-sm text-[#443e39] leading-relaxed">
                When contacting us about an existing order, please include your <strong>order number</strong> and the <strong>email address or phone number</strong> associated with the order.
              </p>
            </section>

            <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
              <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614]">
                Payment Support
              </h2>
              <p className="text-sm text-[#443e39] leading-relaxed">
                For payment-related issues, please provide your <strong>order number</strong> and <strong>relevant transaction details</strong>.
              </p>
            </section>

          </div>

          {/* Security Advisory Callout */}
          <section className="p-5 sm:p-6 bg-[#fcf4f2] rounded-xl border border-[#f3d3cf] flex items-start gap-4">
            <ShieldAlert className="w-6 h-6 text-[#c43224] shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-xs sm:text-sm text-[#3b1d19] leading-relaxed">
              <p className="font-bold text-[#a12013]">
                Important Security Advisory:
              </p>
              <p>
                <strong>Never send your card number, CVV, UPI PIN, password, or OTP through email, phone, or chat.</strong>
              </p>
              <p className="text-[#5e2b24]">
                STUNNING BIRDS will never ask you to share your UPI PIN, card PIN, CVV, password, or OTP.
              </p>
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
