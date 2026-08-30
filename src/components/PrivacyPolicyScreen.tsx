import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Mail, Phone, MapPin, ChevronRight, ArrowLeft, Lock } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { resetDefaultSEO } from '../utils/seoHelper';

export const PrivacyPolicyScreen: React.FC = () => {
  const { setCurrentScreen } = useShop();

  useEffect(() => {
    resetDefaultSEO('privacy-policy');
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
          <span className="text-[#181614] font-medium">Privacy Policy</span>
        </nav>

        {/* Header Banner */}
        <div className="border-b border-[#e6ded2] pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#f0e9df] text-[#8c562e] text-[11px] font-bold uppercase tracking-widest rounded-full mb-4">
            <Lock className="w-3.5 h-3.5" />
            <span>Data Protection & Privacy</span>
          </div>
          <h1 className="font-serif-luxury text-3xl sm:text-4xl md:text-5xl font-semibold text-[#181614] tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-[#736d65] mt-3 font-medium">
            <strong>Effective Date:</strong> 30 August 2026
          </p>
        </div>

        {/* Document Content */}
        <div className="prose prose-stone max-w-none text-[#332f2b] text-sm sm:text-base leading-relaxed space-y-8">
          
          <p className="text-base sm:text-lg text-[#443e39] leading-relaxed">
            <strong className="text-[#181614]">STUNNING BIRDS</strong> respects your privacy and is committed to protecting the personal information you provide while using our website.
          </p>
          <p className="text-sm sm:text-base text-[#554e47]">
            This Privacy Policy explains what information we collect, why we collect it, how it is used, and the choices available to you.
          </p>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">1.</span> Information We Collect
            </h2>
            <p>
              Depending on how you use our website, we may collect:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#443e39]">
              <li>Name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Shipping and billing address</li>
              <li>Order and purchase information</li>
              <li>Account information</li>
              <li>Information provided when contacting customer support</li>
              <li>Product reviews or other information voluntarily submitted</li>
            </ul>
            <p className="pt-2 text-xs sm:text-sm text-[#736d65] bg-[#faf7f2] p-3 rounded-lg border border-[#ede6dc]">
              Payment information is processed through our payment service provider, Razorpay. We do not intentionally store complete card or banking credentials on our own systems.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">2.</span> How We Use Your Information
            </h2>
            <p>We may use collected information to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#443e39]">
              <li>Create and manage customer accounts</li>
              <li>Process and fulfil orders</li>
              <li>Deliver products</li>
              <li>Process payments</li>
              <li>Provide order updates</li>
              <li>Respond to customer enquiries</li>
              <li>Process returns, cancellations, and refunds</li>
              <li>Improve our products and website</li>
              <li>Prevent fraud, abuse, and unauthorised activity</li>
              <li>Maintain website security</li>
              <li>Comply with applicable legal obligations</li>
            </ul>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">3.</span> Payment Processing
            </h2>
            <p>
              Online payments are processed through Razorpay.
            </p>
            <p>
              When you choose an online payment method, relevant information is shared with the payment service provider as necessary to process the transaction.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">4.</span> Cookies and Similar Technologies
            </h2>
            <p>
              Our website may use cookies, local storage, or similar technologies to maintain login sessions, remember preferences, provide shopping-cart functionality, improve website performance, and maintain security.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">5.</span> Third-Party Services
            </h2>
            <p>
              We may use third-party technology and hosting providers to operate our website, database, authentication, storage, payment processing, and related services.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">6.</span> Data Security
            </h2>
            <p>
              We take reasonable technical and organisational measures to protect information against unauthorised access, misuse, alteration, or disclosure.
            </p>
            <p>
              However, no internet-based system can be guaranteed to be completely secure.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">7.</span> Data Retention
            </h2>
            <p>
              We retain information for as long as reasonably necessary to provide our services, maintain business and transaction records, resolve disputes, prevent fraud, and comply with applicable legal requirements.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">8.</span> Your Rights
            </h2>
            <p>
              Depending on applicable law, you may have rights relating to your personal information, including requesting access, correction, or deletion of certain information.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">9.</span> Children's Privacy
            </h2>
            <p>
              Our website is intended for general customers and is not specifically directed toward children.
            </p>
          </section>

          <section className="p-6 bg-white rounded-xl border border-[#ebe4da] shadow-xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">10.</span> Changes to this Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time.
            </p>
          </section>

          {/* Contact Information Section */}
          <section className="p-6 sm:p-8 bg-[#f5ede2] rounded-xl border border-[#e6ded2] shadow-xs space-y-4">
            <h2 className="text-lg sm:text-xl font-serif-luxury font-semibold text-[#181614] flex items-center gap-2">
              <span className="text-[#8c562e] font-sans text-sm font-bold">11.</span> Contact Us
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
