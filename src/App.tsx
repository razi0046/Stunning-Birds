/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShopProvider, useShop } from './context/ShopContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { SearchModal } from './components/SearchModal';
import { LoginModal } from './components/LoginModal';
import { HomeScreen } from './components/HomeScreen';

// Code-split heavy screen modules to drastically reduce initial bundle size and boost TTI
const ShopScreen = React.lazy(() => import('./components/ShopScreen').then(m => ({ default: m.ShopScreen })));
const ProductDetailScreen = React.lazy(() => import('./components/ProductDetailScreen').then(m => ({ default: m.ProductDetailScreen })));
const CheckoutScreen = React.lazy(() => import('./components/CheckoutScreen').then(m => ({ default: m.CheckoutScreen })));
const AdminOverviewScreen = React.lazy(() => import('./components/AdminOverviewScreen').then(m => ({ default: m.AdminOverviewScreen })));
const AdminOrdersScreen = React.lazy(() => import('./components/AdminOrdersScreen').then(m => ({ default: m.AdminOrdersScreen })));
const AdminLoginScreen = React.lazy(() => import('./components/AdminLoginScreen').then(m => ({ default: m.AdminLoginScreen })));
const AccountScreen = React.lazy(() => import('./components/AccountScreen').then(m => ({ default: m.AccountScreen })));
const LoginScreen = React.lazy(() => import('./components/LoginScreen').then(m => ({ default: m.LoginScreen })));
const OrderSuccessScreen = React.lazy(() => import('./components/OrderSuccessScreen').then(m => ({ default: m.OrderSuccessScreen })));
const TermsAndConditionsScreen = React.lazy(() => import('./components/TermsAndConditionsScreen').then(m => ({ default: m.TermsAndConditionsScreen })));
const PrivacyPolicyScreen = React.lazy(() => import('./components/PrivacyPolicyScreen').then(m => ({ default: m.PrivacyPolicyScreen })));
const ShippingPolicyScreen = React.lazy(() => import('./components/ShippingPolicyScreen').then(m => ({ default: m.ShippingPolicyScreen })));
const CancellationAndRefundScreen = React.lazy(() => import('./components/CancellationAndRefundScreen').then(m => ({ default: m.CancellationAndRefundScreen })));
const ContactUsScreen = React.lazy(() => import('./components/ContactUsScreen').then(m => ({ default: m.ContactUsScreen })));
import { AtelierPageLoader } from './components/AtelierPageLoader';
import { Sparkles, CheckCircle2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentScreen, toastMessage, isPageLoading, pageLoadingLabel } = useShop();

  const isAdminScreen = currentScreen === 'admin-overview' || currentScreen === 'admin-orders' || currentScreen === 'admin-login';
  const isCheckoutScreen = currentScreen === 'checkout';

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf8f4] text-[#171513] font-sans antialiased selection:bg-[#8c562e] selection:text-white">
      
      {/* Global Luxury Atelier Page Loader */}
      <AnimatePresence>
        {isPageLoading && (
          <AtelierPageLoader key="atelier-page-loader" label={pageLoadingLabel} />
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-[#181614] text-[#faf7f2] rounded-xs border border-[#38332e] shadow-xl flex items-center space-x-2 text-xs font-medium"
          >
            <CheckCircle2 className="w-4 h-4 text-[#d4af37]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays */}
      <CartDrawer />
      <SearchModal />
      <LoginModal />

      {/* Main Navbar (hidden on checkout and dedicated admin login for clean focus) */}
      {!isCheckoutScreen && currentScreen !== 'admin-login' && <Navbar />}

      {/* Active Screen View with Page Transitions */}
      <main className="flex-1 overflow-hidden">
        <React.Suspense
          fallback={
            <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#8c562e]/25 border-t-[#8c562e] animate-spin" />
              <p className="text-[11px] uppercase tracking-widest text-[#8c857d] font-serif-luxury">Loading Atelier...</p>
            </div>
          }
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {currentScreen === 'home' && <HomeScreen />}
              {currentScreen === 'shop' && <ShopScreen />}
              {currentScreen === 'product-detail' && <ProductDetailScreen />}
              {currentScreen === 'checkout' && <CheckoutScreen />}
              {currentScreen === 'admin-login' && <AdminLoginScreen />}
              {currentScreen === 'admin-overview' && <AdminOverviewScreen />}
              {currentScreen === 'admin-orders' && <AdminOrdersScreen />}
              {currentScreen === 'account' && <AccountScreen />}
              {currentScreen === 'login' && <LoginScreen />}
              {currentScreen === 'order-success' && <OrderSuccessScreen />}
              {currentScreen === 'terms-and-conditions' && <TermsAndConditionsScreen />}
              {currentScreen === 'privacy-policy' && <PrivacyPolicyScreen />}
              {currentScreen === 'shipping-policy' && <ShippingPolicyScreen />}
              {currentScreen === 'cancellation-and-refund' && <CancellationAndRefundScreen />}
              {currentScreen === 'contact-us' && <ContactUsScreen />}
            </motion.div>
          </AnimatePresence>
        </React.Suspense>
      </main>

      {/* Footer (hidden in admin views) */}
      {!isAdminScreen && <Footer />}
    </div>
  );
};

export default function App() {
  return (
    <ShopProvider>
      <MainLayout />
    </ShopProvider>
  );
}
