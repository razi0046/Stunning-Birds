import React from 'react';
import { X, Plus, Minus, Trash2, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { formatINR } from '../utils/formatCurrency';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    removeFromCart,
    updateCartQuantity,
    cartTotal,
    cartCount,
    setCurrentScreen,
    isLoggedIn,
    openAuthModal,
    showToast,
    openProductBySlug,
  } = useShop();

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    if (!isLoggedIn) {
      setIsCartOpen(false);
      openAuthModal(
        'login',
        () => {
          setCurrentScreen('checkout');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        'Please sign in or create an account to proceed to bespoke checkout'
      );
      showToast('Please sign in to complete your checkout');
      return;
    }

    setIsCartOpen(false);
    setCurrentScreen('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-300"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#fbf9f5] shadow-2xl border-l border-[#e4dcd0] flex flex-col animate-in slide-in-from-right duration-300">
          
          {/* Drawer Header */}
          <div className="p-6 border-b border-[#ece5da] flex items-center justify-between bg-[#f6f2ea]">
            <div className="flex items-center space-x-3">
              <ShoppingBag className="w-5 h-5 text-[#8c562e]" />
              <h2 className="font-serif-luxury text-xl font-semibold text-[#181614]">
                Your Bespoke Bag ({cartCount})
              </h2>
            </div>
            <button
              id="close-cart-btn"
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 text-[#6e6761] hover:text-[#181614] rounded-full hover:bg-[#eae3d7] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="w-16 h-16 rounded-full bg-[#eee7dc] flex items-center justify-center text-[#8c562e]">
                  <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
                </div>
                <h3 className="font-serif-luxury text-lg font-medium text-[#181614]">
                  Your bag is currently empty
                </h3>
                <p className="text-sm text-[#78716c] max-w-xs">
                  Discover our permanent collection of handcrafted leather essentials.
                </p>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setCurrentScreen('shop');
                  }}
                  className="mt-2 px-6 py-2.5 bg-[#1c1917] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#8c562e] transition-colors"
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              cart.map(item => (
                <div
                  key={item.id}
                  className="flex space-x-4 p-4 rounded-lg bg-white border border-[#ece5da] shadow-xs"
                >
                  <img
                    src={item.product.images[0]}
                    alt={`${item.product.name} - Handcrafted ${item.product.material || 'leather'} in ${item.product.colorName}`}
                    referrerPolicy="no-referrer"
                    className="w-20 h-24 object-cover rounded bg-[#eee7dc] shrink-0 cursor-pointer"
                    onClick={() => {
                      setIsCartOpen(false);
                      openProductBySlug(item.product.slug || item.product.id);
                    }}
                  />
                  
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-serif-luxury text-base font-semibold text-[#181614] leading-snug">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-[#a8a199] hover:text-[#991b1b] p-1 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-[#78716c] mt-0.5">
                        {item.selectedColor || item.product.colorName}
                      </p>

                      {item.monogram && (
                        <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#f6f2ea] text-[11px] font-medium text-[#644426] border border-[#e4d9cb]">
                          <span>Monogram: <strong>{item.monogram}</strong></span>
                          {item.foilColor && <span>• {item.foilColor}</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#f0eae0]">
                      <div className="flex items-center border border-[#dcd3c4] rounded bg-[#faf8f5]">
                        <button
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-[#eee7dc] text-[#554e47] transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold text-[#181614]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-[#eee7dc] text-[#554e47] transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="font-serif-luxury text-base font-semibold text-[#181614]">
                        {formatINR(item.product.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer */}
          {cart.length > 0 && (
            <div className="p-6 bg-[#f6f2ea] border-t border-[#ece5da] space-y-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-[#78716c]">
                  <span>Subtotal</span>
                  <span className="font-medium text-[#181614]">{formatINR(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-[#78716c]">
                  <span>Shipping</span>
                  <span className="text-[#15803d] font-medium">Complimentary Courier</span>
                </div>
                <div className="flex justify-between text-base font-serif-luxury font-bold text-[#181614] pt-2 border-t border-[#e2d8c9]">
                  <span>Estimated Total (Incl. GST)</span>
                  <span>{formatINR(cartTotal + Math.round(cartTotal * 0.18))}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#78716c] justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-[#8c562e]" />
                <span>Complimentary Atelier Dust Pouch & Authentication Card</span>
              </div>

              <button
                id="cart-checkout-btn"
                onClick={handleCheckout}
                className="w-full py-3.5 px-6 bg-[#181614] hover:bg-[#8c562e] text-white text-xs font-semibold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer shadow-md"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
