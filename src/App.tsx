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
import { ShopScreen } from './components/ShopScreen';
import { ProductDetailScreen } from './components/ProductDetailScreen';
import { CheckoutScreen } from './components/CheckoutScreen';
import { AdminOverviewScreen } from './components/AdminOverviewScreen';
import { AdminOrdersScreen } from './components/AdminOrdersScreen';
import { AdminLoginScreen } from './components/AdminLoginScreen';
import { AccountScreen } from './components/AccountScreen';
import { LoginScreen } from './components/LoginScreen';
import { OrderSuccessScreen } from './components/OrderSuccessScreen';
import { TermsAndConditionsScreen } from './components/TermsAndConditionsScreen';
import { PrivacyPolicyScreen } from './components/PrivacyPolicyScreen';
import { ShippingPolicyScreen } from './components/ShippingPolicyScreen';
import { CancellationAndRefundScreen } from './components/CancellationAndRefundScreen';
import { ContactUsScreen } from './components/ContactUsScreen';
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
