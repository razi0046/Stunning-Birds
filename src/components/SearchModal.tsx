import React, { useState, useMemo } from 'react';
import { Search, X, ArrowRight, Star } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { formatINR } from '../utils/formatCurrency';

export const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, products, openProductBySlug } = useShop();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return products.slice(0, 4);
    const q = query.toLowerCase();
    return products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.colorName.toLowerCase().includes(q)
    );
  }, [query, products]);

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity"
        onClick={() => setIsSearchOpen(false)}
      />

      <div className="min-h-full flex items-start justify-center p-4 pt-20 sm:p-6 sm:pt-24">
        <div className="relative w-full max-w-2xl bg-[#fbf9f5] rounded-xl shadow-2xl border border-[#e4dcd0] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Search Header */}
          <div className="p-4 sm:p-6 border-b border-[#ece5da] flex items-center gap-3 bg-[#f6f2ea]">
            <Search className="w-5 h-5 text-[#8c562e]" />
            <input
              id="search-catalog-input"
              type="text"
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search handcrafted leather wallets, cardholders..."
              className="w-full bg-transparent text-base sm:text-lg text-[#181614] placeholder-[#8c857d] focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 text-[#8c857d] hover:text-[#181614]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsSearchOpen(false)}
              className="ml-2 text-xs font-semibold uppercase tracking-wider text-[#78716c] hover:text-[#181614]"
            >
              ESC
            </button>
          </div>

          {/* Quick Categories */}
          <div className="px-6 py-3 bg-[#faf7f2] border-b border-[#ece5da] flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[#8c857d] uppercase tracking-wider">Popular:</span>
            {['Bifold', 'Cardholder', 'Travel Wallet', 'Clutch Wallet', 'Bridle'].map(term => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="px-2.5 py-1 rounded-full bg-[#eee7dc] hover:bg-[#8c562e] hover:text-white text-[#4a443e] font-medium transition-colors"
              >
                {term}
              </button>
            ))}
          </div>

          {/* Search Results */}
          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
            <div className="text-xs uppercase tracking-widest font-semibold text-[#8c857d]">
              {query ? `Found ${filtered.length} matching pieces` : 'Featured Leather Wallets'}
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-8 text-sm text-[#78716c]">
                No leather goods found matching "{query}". Try searching "bifold", "cardholder", or "wallet".
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map(product => (
                  <div
                    key={product.id}
                    onClick={() => {
                      setIsSearchOpen(false);
                      openProductBySlug(product.slug || product.id);
                    }}
                    className="group flex gap-3 p-3 rounded-lg bg-white border border-[#ece5da] hover:border-[#8c562e] hover:shadow-md cursor-pointer transition-all"
                  >
                    <img
                      src={product.images[0]}
                      alt={`${product.name} - Handcrafted ${product.material || 'leather'} in ${product.colorName}`}
                      referrerPolicy="no-referrer"
                      className="w-16 h-20 object-cover rounded bg-[#eee7dc] group-hover:scale-105 transition-transform"
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1 text-[11px] text-[#8c562e] font-medium">
                          <span>{product.category}</span>
                        </div>
                        <h4 className="font-serif-luxury text-sm font-semibold text-[#181614] group-hover:text-[#8c562e] transition-colors leading-tight">
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-[#78716c] mt-0.5">
                          <Star className="w-3 h-3 fill-[#d4af37] text-[#d4af37]" />
                          <span>{product.rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-baseline gap-2">
                          {Boolean(product.originalPrice && product.originalPrice > product.price) && (
                            <span className="text-xs text-[#8c857d] line-through">
                              {formatINR(product.originalPrice!)}
                            </span>
                          )}
                          <span className="font-serif-luxury text-sm font-bold text-[#181614]">
                            {formatINR(product.price)}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#8c562e] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
