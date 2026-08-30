import React, { useState } from 'react';
import { ArrowRight, Check, Sparkles, Shield } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { supabase } from '../supabaseClient';
import brandLogo from '../assets/images/stunning_birds_transparent.png';

export const Footer: React.FC = () => {
  const { setCurrentScreen, setSelectedCategoryFilter, showToast, isAdminAuthenticated } = useShop();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return;

    try {
      await supabase.from('newsletter_subscribers').insert({ email: cleanEmail });
    } catch {}

    try {
      await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
    } catch {}
    setSubscribed(true);
    showToast('Subscribed to the Stunning Birds Journal.');
    setEmail('');
  };

  const handleLink = (screen: any, category?: string) => {
    if (category) setSelectedCategoryFilter(category);
    setCurrentScreen(screen);
    if (screen === 'home') window.location.hash = '/';
    else if (screen === 'shop') window.location.hash = '/shop';
    else if (screen === 'account') window.location.hash = '/account';
    else if (screen === 'terms-and-conditions') window.location.hash = '/terms-and-conditions';
    else if (screen === 'privacy-policy') window.location.hash = '/privacy-policy';
    else if (screen === 'shipping-policy') window.location.hash = '/shipping-policy';
    else if (screen === 'cancellation-and-refund') window.location.hash = '/cancellation-and-refund';
    else if (screen === 'contact-us') window.location.hash = '/contact-us';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminClick = () => {
    if (isAdminAuthenticated) {
      setCurrentScreen('admin-overview');
      window.location.hash = '/admin-overview';
    } else {
      setCurrentScreen('admin-login');
      window.location.hash = '/admin-login';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#0f0e0d] text-[#e8e3dc] pt-20 pb-12 border-t border-[#262320]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-8 lg:gap-10 pb-16 border-b border-[#262320]">
          
          {/* Brand Col */}
          <div className="sm:col-span-2 md:col-span-3 space-y-4">
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleLink('home')}
                className="text-left group cursor-pointer focus:outline-none block"
              >
                <img
                  id="footer-brand-logo"
                  src={brandLogo}
                  alt="Stunning Birds - Show Your Presence"
                  className="w-full max-w-[200px] sm:max-w-[240px] h-auto object-contain select-none block transition-opacity duration-300 group-hover:opacity-90"
                  referrerPolicy="no-referrer"
                />
              </button>
            </div>
            <p className="text-sm text-[#a8a199] leading-relaxed max-w-sm">
              Modern luxury leather goods, crafted slowly for a life well-lived. Designed with intention in our atelier to develop a rich, timeless patina.
            </p>
            <p className="text-xs text-[#736d65] pt-4">
              © {new Date().getFullYear()} Stunning Birds Leather Goods. All rights reserved.
            </p>
          </div>

          {/* Links Col 1: Shop */}
          <div className="space-y-3 md:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[#faf8f5]">
              Shop
            </h4>
            <ul className="space-y-2.5 text-sm text-[#a8a199]">
              <li>
                <button
                  onClick={() => handleLink('shop', 'Bifold Wallets')}
                  className="hover:text-[#faf8f5] transition-colors cursor-pointer text-left"
                >
                  Bifold Wallets
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('shop', 'Cardholders')}
                  className="hover:text-[#faf8f5] transition-colors cursor-pointer text-left"
                >
                  Cardholders
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('shop', 'Bags & Totes')}
                  className="hover:text-[#faf8f5] transition-colors cursor-pointer text-left"
                >
                  Bags & Totes
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('shop', 'Accessories')}
                  className="hover:text-[#faf8f5] transition-colors cursor-pointer text-left"
                >
                  Key Fobs & Covers
                </button>
              </li>
            </ul>
          </div>

          {/* Links Col 2: Customer Information */}
          <div className="space-y-3 md:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[#faf8f5]">
              Customer Information
            </h4>
            <ul className="space-y-2.5 text-sm text-[#a8a199]">
              <li>
                <button
                  onClick={() => handleLink('terms-and-conditions')}
                  className="hover:text-[#faf8f5] transition-colors cursor-pointer text-left"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('privacy-policy')}
                  className="hover:text-[#faf8f5] transition-colors cursor-pointer text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('shipping-policy')}
                  className="hover:text-[#faf8f5] transition-colors cursor-pointer text-left"
                >
                  Shipping Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('cancellation-and-refund')}
                  className="hover:text-[#faf8f5] transition-colors cursor-pointer text-left"
                >
                  Cancellation & Refund
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('contact-us')}
                  className="hover:text-[#faf8f5] transition-colors cursor-pointer text-left"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Links Col 3: Account */}
          <div className="space-y-3 md:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[#faf8f5]">
              Account
            </h4>
            <ul className="space-y-2.5 text-sm text-[#a8a199]">
              <li>
                <button
                  onClick={() => handleLink('account')}
                  className="hover:text-[#faf8f5] transition-colors cursor-pointer text-left"
                >
                  Overview
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('account')}
                  className="hover:text-[#faf8f5] transition-colors cursor-pointer text-left"
                >
                  My Commissions
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('account')}
                  className="hover:text-[#faf8f5] transition-colors cursor-pointer text-left"
                >
                  Society Points
                </button>
              </li>
              <li>
                <button
                  id="footer-admin-btn"
                  onClick={handleAdminClick}
                  className="hover:text-[#d4af37] text-[#a8a199] transition-colors flex items-center gap-1.5 group cursor-pointer text-left"
                >
                  <Shield className="w-3.5 h-3.5 text-[#d4af37]/80 group-hover:text-[#d4af37] transition-colors" />
                  <span>Admin Portal</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter Col */}
          <div className="sm:col-span-2 md:col-span-3 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[#faf8f5]">
              STAY CONNECTED
            </h4>
            <p className="text-xs text-[#a8a199] leading-relaxed">
              Receive private atelier announcements, archival releases, and artisan journal stories.
            </p>
            <form onSubmit={handleSubscribe} className="relative flex items-center pt-2">
              <input
                id="footer-email-input"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full bg-transparent border-b border-[#443e39] py-2.5 pr-10 text-sm text-[#faf8f5] placeholder-[#736d65] focus:outline-none focus:border-[#d4af37] transition-colors"
              />
              <button
                id="footer-subscribe-btn"
                type="submit"
                className="absolute right-0 top-3 text-[#a8a199] hover:text-[#d4af37] transition-colors p-1 cursor-pointer"
                aria-label="Submit Email"
              >
                {subscribed ? (
                  <Check className="w-4 h-4 text-[#d4af37]" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </form>
            {subscribed && (
              <p className="text-xs text-[#d4af37] pt-1">Thank you for joining our circle.</p>
            )}
          </div>

        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#736d65] gap-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <button 
              onClick={() => handleLink('privacy-policy')}
              className="hover:text-[#faf8f5] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => handleLink('terms-and-conditions')}
              className="hover:text-[#faf8f5] transition-colors cursor-pointer"
            >
              Terms & Conditions
            </button>
            <button 
              onClick={() => handleLink('shipping-policy')}
              className="hover:text-[#faf8f5] transition-colors cursor-pointer"
            >
              Shipping Policy
            </button>
            <button 
              onClick={() => handleLink('cancellation-and-refund')}
              className="hover:text-[#faf8f5] transition-colors cursor-pointer"
            >
              Cancellation & Refund
            </button>
            <button 
              onClick={() => handleLink('contact-us')}
              className="hover:text-[#faf8f5] transition-colors cursor-pointer"
            >
              Contact Us
            </button>
          </div>
          <div>
            <span>Crafted with Tuscan Vegetable-Tanned Full-Grain Leather</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
