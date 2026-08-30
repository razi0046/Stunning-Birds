import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText, Shield, Mail, Phone, MapPin, ChevronRight, ArrowLeft } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { resetDefaultSEO } from '../utils/seoHelper';

export const TermsAndConditionsScreen: React.FC = () => {
  const { setCurrentScreen } = useShop();

  useEffect(() => {
    resetDefaultSEO('terms-and-conditions');
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
          <span className="text-[#181614] font-medium">Terms & Conditions</span>
        </nav>

        {/* Header Banner */}
        <div className="border-b border-[#e6ded2] pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#f0e9df] text-[#8c562e] text-[11px] font-bold uppercase tracking-widest rounded-full mb-4">
            <FileText className="w-3.5 h-3.5" />
            <span>Legal Documentation</span>
          </div>
          <h1 className="font-serif-luxury text-3xl sm:text-4xl md:text-5xl font-semibold text-[#181614] tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-sm text-[#736d65] mt-3 font-medium">
            <strong>Effective Date:</strong> 30th August 2026
          </p>
        </div>

        {/* Document Content */}
        <div className="prose prose-stone max-w-none text-[#332f2b] text-sm sm:text-base leading-relaxed space-y-8">
          
          <p className="text-base sm:text-lg text-[#443e39] leading-relaxed">
            Welcome to <strong className="text-[#181614]">STUNNING BIRDS</strong>. These Terms & Conditions govern your use of our website and your purchase of products from us. By accessing our website or placing an order, you agree to these terms.
          </p>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">1.</span> About Our Website
            </h2>
            <p>
              STUNNING BIRDS is an online store offering products for purchase through our website.
            </p>
            <p>
              We reserve the right to update, modify, suspend, or discontinue any part of the website or its services where reasonably necessary.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">2.</span> Products and Product Information
            </h2>
            <p>
              We make reasonable efforts to ensure that product descriptions, images, prices, availability, and other information displayed on the website are accurate.
            </p>
            <p>
              However, product colours and appearance may vary slightly depending on your device's display.
            </p>
            <p>
              We reserve the right to correct errors, update product information, or change product availability at any time.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">3.</span> Pricing
            </h2>
            <p>
              All product prices displayed on the website are in Indian Rupees (INR), unless otherwise stated.
            </p>
            <p>
              Prices may be changed at any time. The price applicable to an order is the price displayed at the time the order is placed.
            </p>
            <p>
              If a pricing error occurs, we reserve the right to cancel the affected order and provide an appropriate refund where payment has already been received.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">4.</span> Orders
            </h2>
            <p>
              An order placed through the website is a request to purchase the selected products.
            </p>
            <p>
              We reserve the right to accept or decline an order in situations including product unavailability, incorrect pricing, suspected fraudulent activity, or technical errors.
            </p>
            <p>
              Once an order is accepted and payment is successfully processed, an order confirmation will be provided through the contact information supplied by the customer.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">5.</span> Payments
            </h2>
            <p>
              Payments are processed through our authorised payment gateway, Razorpay.
            </p>
            <p>
              We do not directly collect or store complete card, UPI, or banking credentials on our website. Payment processing is handled through the payment gateway according to its applicable security and privacy practices.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">6.</span> Shipping and Delivery
            </h2>
            <p>
              Orders are shipped according to our Shipping Policy.
            </p>
            <p>
              Estimated delivery dates are provided for guidance and may vary because of courier delays, weather conditions, public holidays, incorrect delivery information, or circumstances beyond our reasonable control.
            </p>
            <p>
              Customers are responsible for providing accurate delivery information.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">7.</span> Cancellation, Returns and Refunds
            </h2>
            <p>
              Order cancellation, return, replacement, and refund requests are governed by our Cancellation & Refund Policy.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">8.</span> Customer Accounts
            </h2>
            <p>
              If you create an account on our website, you are responsible for maintaining the confidentiality of your login information and for activity performed through your account.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">9.</span> Prohibited Use
            </h2>
            <p>
              You must not use our website for unlawful purposes, attempt unauthorised access, interfere with website functionality, or submit false or fraudulent information.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">10.</span> Intellectual Property
            </h2>
            <p>
              The website's content, including logos, product photographs, text, graphics, design elements, and other materials, belongs to STUNNING BIRDS or its respective licensors unless otherwise stated.
            </p>
            <p>
              You may not reproduce, distribute, modify, or commercially use our content without prior written permission.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">11.</span> Limitation of Liability
            </h2>
            <p>
              To the extent permitted by applicable law, STUNNING BIRDS shall not be responsible for losses resulting from circumstances outside our reasonable control, including courier delays, internet or technical failures, or third-party service interruptions.
            </p>
            <p>
              Nothing in these terms is intended to exclude rights or protections that cannot legally be excluded.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">12.</span> Changes to These Terms
            </h2>
            <p>
              We may update these Terms & Conditions from time to time. The updated version will be published on this page with a revised effective date.
            </p>
          </section>

          {/* Contact Information Section */}
          <section className="p-6 sm:p-8 bg-[#f5ede2] rounded-xl border border-[#e6ded2] shadow-xs space-y-4">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">13.</span> Contact
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
