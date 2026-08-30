import React, { useState } from 'react';
import { Search, Heart, User, ShoppingBag, Menu, X, Shield, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useShop, ScreenView } from '../context/ShopContext';

export const Navbar: React.FC = () => {
  const {
    currentScreen,
    setCurrentScreen,
    cartCount,
    setIsCartOpen,
    setIsSearchOpen,
    userProfile,
    setSelectedCategoryFilter,
    isLoggedIn,
    openAuthModal,
  } = useShop();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If we are in Admin screens, we might render the full layout or a dedicated header
  const isAdminView = currentScreen === 'admin-overview' || currentScreen === 'admin-orders';

  const handleNavClick = (screen: ScreenView, category?: string) => {
    if (category) {
      setSelectedCategoryFilter(category);
    }
    setCurrentScreen(screen);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAccountClick = () => {
    if (!isLoggedIn) {
      openAuthModal('login', undefined, 'Sign in to access your client portal & commissions');
    } else {
      handleNavClick('account');
    }
  };

  const handleAdminNavClick = () => {
    if (userProfile.isAdmin) {
      handleNavClick('admin-overview');
    } else {
      handleNavClick('admin-login');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl sm:backdrop-blur-2xl border-b border-[#e8dfd5]/80 shadow-[0_4px_20px_0_rgba(0,0,0,0.03)] transition-all duration-300">
      {/* Top Banner for announcement with frosted glass style */}
      <div className="bg-[#1c1917] text-[#e7e2d9] text-[10px] sm:text-[11px] font-medium tracking-widest text-center py-1.5 px-3 uppercase flex items-center justify-center gap-1.5 sm:gap-2 border-b border-white/10">
        <Sparkles className="w-3 h-3 text-[#d4af37] shrink-0 animate-pulse" />
        <span className="truncate max-w-[90vw]">Complimentary Monogramming & Worldwide Courier on atelier orders</span>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-16 sm:h-20 gap-2 sm:gap-4 w-full">
          
          {/* Left: Mobile/Tablet Menu Button + Desktop Nav Links */}
          <div className="flex items-center justify-start min-w-0">
            {/* Mobile/Tablet Menu Button (Visible below lg breakpoint) */}
            <div className="flex lg:hidden items-center">
              <button
                id="mobile-menu-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 sm:p-2 text-[#2e2a27] hover:text-[#8c562e] rounded-full hover:bg-black/5 transition-colors cursor-pointer"
                aria-label="Toggle Navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
            </div>

            {/* Desktop Navigation Links (Visible on lg and larger) */}
            <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2 text-xs xl:text-[13px] tracking-wide text-[#2e2a27] font-medium">
              
              {/* Shop Nav Link */}
              <button
                id="nav-shop-btn"
                onClick={() => handleNavClick('shop', 'All')}
                className={`relative px-2.5 xl:px-3 py-2 group cursor-pointer transition-colors duration-200 ${
                  currentScreen === 'shop' ? 'text-[#8c562e] font-semibold' : 'text-[#2e2a27] hover:text-[#8c562e]'
                }`}
              >
                <span>Shop</span>
                <span
                  className={`absolute bottom-0.5 left-2.5 right-2.5 h-[2px] bg-[#8c562e] rounded-full transition-all duration-300 origin-left ${
                    currentScreen === 'shop'
                      ? 'scale-x-100 opacity-100'
                      : 'scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100'
                  }`}
                />
              </button>

              {/* Collections Nav Link */}
              <button
                id="nav-collections-btn"
                onClick={() => handleNavClick('shop', 'Bifold Wallets')}
                className="relative px-2.5 xl:px-3 py-2 group cursor-pointer transition-colors duration-200 text-[#2e2a27] hover:text-[#8c562e]"
              >
                <span>Collections</span>
                <span className="absolute bottom-0.5 left-2.5 right-2.5 h-[2px] bg-[#8c562e] rounded-full transition-all duration-300 origin-left scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100" />
              </button>

              {/* New Arrivals Nav Link */}
              <button
                id="nav-new-arrivals-btn"
                onClick={() => handleNavClick('shop', 'Accessories')}
                className="relative px-2.5 xl:px-3 py-2 group cursor-pointer transition-colors duration-200 text-[#2e2a27] hover:text-[#8c562e] whitespace-nowrap"
              >
                <span>New Arrivals</span>
                <span className="absolute bottom-0.5 left-2.5 right-2.5 h-[2px] bg-[#8c562e] rounded-full transition-all duration-300 origin-left scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100" />
              </button>

              {/* Journal / Home Story Link */}
              <button
                id="nav-home-story-btn"
                onClick={() => handleNavClick('home')}
                className={`relative px-2.5 xl:px-3 py-2 group cursor-pointer transition-colors duration-200 ${
                  currentScreen === 'home' ? 'text-[#8c562e] font-semibold' : 'text-[#2e2a27] hover:text-[#8c562e]'
                }`}
              >
                <span>Journal</span>
                <span
                  className={`absolute bottom-0.5 left-2.5 right-2.5 h-[2px] bg-[#8c562e] rounded-full transition-all duration-300 origin-left ${
                    currentScreen === 'home'
                      ? 'scale-x-100 opacity-100'
                      : 'scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100'
                  }`}
                />
              </button>
            </nav>
          </div>

          {/* Center: Brand Logo (Precisely Centered on All Screens) */}
          <div className="flex items-center justify-center text-center px-1 sm:px-4 min-w-0 justify-self-center">
            <button
              id="brand-logo-btn"
              onClick={() => handleNavClick('home')}
              className="group relative inline-flex flex-col items-center justify-center text-center cursor-pointer py-1 transition-transform duration-300 hover:scale-[1.02] max-w-full mx-auto"
            >
              <span className="font-serif-luxury text-base sm:text-xl md:text-2xl xl:text-[25px] tracking-[0.15em] sm:tracking-[0.22em] font-semibold text-[#181614] uppercase group-hover:text-[#8c562e] transition-colors truncate max-w-full">
                STUNNING BIRDS
              </span>
              <span className="text-[7px] sm:text-[8px] md:text-[9px] tracking-[0.25em] sm:tracking-[0.3em] uppercase text-[#8c827a] group-hover:text-[#8c562e] -mt-0.5 sm:-mt-1 font-sans transition-colors text-center">
                LEATHER ATELIER
              </span>
              <span className="absolute -bottom-0.5 left-1/4 right-1/4 h-[1.5px] bg-[#8c562e]/70 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" />
            </button>
          </div>

          {/* Right: Action Icons with responsive spacing and sizing */}
          <div className="flex items-center justify-end space-x-0.5 sm:space-x-1.5 md:space-x-2 text-[#2b2724] justify-self-end">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              id="header-search-btn"
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 sm:p-2 rounded-full hover:bg-black/5 hover:text-[#8c562e] transition-colors cursor-pointer"
              aria-label="Search Catalog"
              title="Search"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              id="header-wishlist-btn"
              onClick={() => handleNavClick('account')}
              className="p-1.5 sm:p-2 rounded-full hover:bg-black/5 hover:text-[#8c562e] transition-colors relative cursor-pointer"
              aria-label="Wishlist"
              title="Wishlist / Recently Admired"
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" />
              {userProfile.wishlistProductIds.length > 0 && (
                <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#8c562e] rounded-full ring-2 ring-white/80" />
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              id="header-account-btn"
              onClick={handleAccountClick}
              className={`p-1.5 sm:p-2 rounded-full hover:bg-black/5 hover:text-[#8c562e] transition-colors relative cursor-pointer ${
                currentScreen === 'account' ? 'text-[#8c562e] bg-[#8c562e]/10' : ''
              }`}
              aria-label={isLoggedIn ? `Account (${userProfile.name})` : 'Client Sign In'}
              title={isLoggedIn ? `Account (${userProfile.name})` : 'Client Sign In'}
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" />
              {isLoggedIn && (
                <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#15803d] rounded-full ring-2 ring-white" />
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              id="header-cart-btn"
              onClick={() => setIsCartOpen(true)}
              className="p-1.5 sm:p-2 rounded-full hover:bg-black/5 hover:text-[#8c562e] transition-colors relative cursor-pointer"
              aria-label="Shopping Bag"
              title="View Bag"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 sm:top-0.5 sm:-right-0.5 bg-[#8c562e] text-white text-[9px] sm:text-[10px] font-bold rounded-full w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </motion.button>
          </div>

        </div>
      </div>

      {/* Mobile & Tablet Drawer Menu with clean backdrop, smooth entrance, and no overflow */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop for mobile & tablet drawer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 top-[calc(2.5rem+4rem)] sm:top-[calc(2.5rem+5rem)] bg-black/30 backdrop-blur-xs z-30 lg:hidden"
            />
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="lg:hidden relative z-40 border-t border-[#e8dfd5] bg-[#faf7f2]/95 backdrop-blur-2xl px-5 sm:px-8 py-5 space-y-4 shadow-xl overflow-hidden max-h-[80vh] overflow-y-auto"
            >
              <div className="flex flex-col space-y-1 text-sm sm:text-base text-[#2e2a27] font-medium">
                <button
                  onClick={() => handleNavClick('home')}
                  className={`text-left px-3.5 py-2.5 rounded-xs hover:bg-black/5 hover:text-[#8c562e] transition-colors cursor-pointer ${
                    currentScreen === 'home' ? 'bg-black/5 text-[#8c562e] font-semibold' : ''
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => handleNavClick('shop', 'All')}
                  className={`text-left px-3.5 py-2.5 rounded-xs hover:bg-black/5 hover:text-[#8c562e] transition-colors cursor-pointer ${
                    currentScreen === 'shop' ? 'bg-black/5 text-[#8c562e] font-semibold' : ''
                  }`}
                >
                  Shop All Products
                </button>
                <button
                  onClick={() => handleNavClick('shop', 'Bifold Wallets')}
                  className="text-left px-3.5 py-2.5 rounded-xs hover:bg-black/5 hover:text-[#8c562e] transition-colors cursor-pointer text-[#5c544d]"
                >
                  Wallets & Cardholders
                </button>
                <button
                  onClick={() => handleNavClick('shop', 'Bags & Totes')}
                  className="text-left px-3.5 py-2.5 rounded-xs hover:bg-black/5 hover:text-[#8c562e] transition-colors cursor-pointer text-[#5c544d]"
                >
                  Bags & Totes
                </button>
                <button
                  onClick={() => handleNavClick('shop', 'Accessories')}
                  className="text-left px-3.5 py-2.5 rounded-xs hover:bg-black/5 hover:text-[#8c562e] transition-colors cursor-pointer text-[#5c544d]"
                >
                  Accessories & Key Fobs
                </button>

                <div className="pt-2 my-2 border-t border-[#ded5c7]" />

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleAccountClick();
                  }}
                  className="text-left px-3.5 py-2.5 rounded-xs hover:bg-black/5 hover:text-[#8c562e] transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>{isLoggedIn ? 'My Account & Commissions' : 'Client Sign In'}</span>
                  {isLoggedIn && (
                    <span className="text-[11px] bg-[#f0eae0] text-[#8c562e] px-2 py-0.5 rounded-xs font-semibold">
                      {userProfile.name.split(' ')[0]}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleAdminNavClick();
                  }}
                  className="text-left px-3.5 py-2.5 rounded-xs hover:bg-black/5 hover:text-[#8c562e] text-[#8c562e] transition-colors font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  <span>Commerce Manager (Admin)</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

