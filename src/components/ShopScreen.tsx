import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ChevronDown, SlidersHorizontal, Check, Heart, Eye, ShoppingBag, ArrowRight } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { Product, ProductCategory } from '../types';
import { formatINR } from '../utils/formatCurrency';
import { resetDefaultSEO } from '../utils/seoHelper';

interface ShopProductCardProps {
  product: Product;
  idx: number;
  isWishlisted: boolean;
  onOpenProduct: (slugOrId: string) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onToggleWishlist: (productId: string) => void;
}

const ShopProductCard: React.FC<ShopProductCardProps> = React.memo(({
  product,
  idx,
  isWishlisted,
  onOpenProduct,
  onAddToCart,
  onToggleWishlist,
}) => {
  return (
    <motion.div
      key={product.id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.45, delay: (idx % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="group flex flex-col justify-between bg-white border border-[#ece4d8] rounded-xs overflow-hidden shadow-2xs hover:shadow-xl hover:border-[#cfc2b0] transition-all duration-300"
    >
      {/* Card Image & Badges */}
      <div className="relative aspect-4/5 w-full bg-[#f6f2ea] overflow-hidden">
        {product.badge && (
          <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 bg-white/95 backdrop-blur-xs text-black text-[9px] font-bold tracking-widest uppercase shadow-2xs">
            {product.badge}
          </span>
        )}

        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product.id);
          }}
          className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full bg-white/85 hover:bg-white text-[#78716c] hover:text-[#8c562e] transition-colors shadow-2xs cursor-pointer"
          title="Admire item"
        >
          <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-[#8c562e] text-[#8c562e]' : ''}`} />
        </motion.button>

        <img
          src={product.images[0]}
          alt={`${product.name} - Handcrafted ${product.material || 'leather'} in ${product.colorName}`}
          referrerPolicy="no-referrer"
          loading={idx < 4 ? "eager" : "lazy"}
          decoding="async"
          className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 ease-out cursor-pointer"
          onClick={() => onOpenProduct(product.slug || product.id)}
        />

        {/* Quick Add Overlay on hover */}
        <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 flex gap-1.5 sm:gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onOpenProduct(product.slug || product.id)}
            className="flex-1 py-1.5 sm:py-2 bg-white/95 hover:bg-white text-black text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
          >
            Inspect
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => onAddToCart(product, 1)}
            className="p-1.5 sm:p-2 bg-[#8c562e] hover:bg-black text-white text-[9px] sm:text-[10px] transition-colors shadow-xs cursor-pointer"
            title="Add to Bag"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      {/* Product Metadata */}
      <div className="p-3 sm:p-4 space-y-1.5 sm:space-y-2 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-0.5 sm:gap-2">
            <h3
              onClick={() => onOpenProduct(product.slug || product.id)}
              className="font-serif-luxury text-xs sm:text-sm font-semibold text-[#181614] group-hover:text-[#8c562e] transition-colors cursor-pointer leading-tight line-clamp-1 sm:line-clamp-none"
            >
              {product.name}
            </h3>
            <div className="text-left sm:text-right whitespace-nowrap">
              {Boolean(product.originalPrice && product.originalPrice > product.price) && (
                <span className="text-[10px] sm:text-[11px] text-[#8c857d] line-through block leading-none mb-0.5">
                  {formatINR(product.originalPrice!)}
                </span>
              )}
              <span className="font-serif-luxury text-xs sm:text-sm font-semibold text-[#181614]">
                {formatINR(product.price)}
              </span>
            </div>
          </div>

          <p className="text-[10px] sm:text-[11px] text-[#78716c] mt-0.5 truncate">
            {product.colorName}
          </p>
        </div>

        {/* Star Rating */}
        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-[#78716c] pt-0.5 sm:pt-1">
          <div className="flex items-center text-[#d4af37]">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${i < Math.floor(product.rating) ? 'fill-[#d4af37]' : 'text-[#ded5c7]'}`}
              />
            ))}
          </div>
          <span className="text-[9px] sm:text-[10px]">({product.reviewsCount})</span>
        </div>
      </div>
    </motion.div>
  );
});
ShopProductCard.displayName = 'ShopProductCard';

export const ShopScreen: React.FC = () => {
  const {
    products,
    openProductBySlug,
    addToCart,
    userProfile,
    toggleWishlist,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    selectedColorFilter,
    setSelectedColorFilter,
    setCurrentScreen,
  } = useShop();

  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  const [colorFilterOpen, setColorFilterOpen] = useState(true);
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Synchronize SEO on Shop screen mount or category switch
  useEffect(() => {
    resetDefaultSEO('shop', selectedCategoryFilter);
  }, [selectedCategoryFilter]);

  const categories: { label: string; value: ProductCategory | 'All' }[] = [
    { label: 'All Pieces', value: 'All' },
    { label: 'Bifold Wallets', value: 'Bifold Wallets' },
    { label: 'Cardholders', value: 'Cardholders' },
    { label: 'Travel Wallets', value: 'Travel Wallets' },
    { label: 'Bags & Totes', value: 'Bags & Totes' },
    { label: 'Accessories', value: 'Accessories' },
  ];

  const colors = [
    { name: 'Espresso', hex: '#3a2012' },
    { name: 'Cognac', hex: '#9c5221' },
    { name: 'Olive', hex: '#3b4336' },
    { name: 'Black', hex: '#1f1f1f' },
    { name: 'Tan', hex: '#b27a4b' },
    { name: 'Sage', hex: '#5e7258' },
  ];

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategoryFilter && selectedCategoryFilter !== 'All') {
      list = list.filter(p => p.category === selectedCategoryFilter);
    }

    if (selectedColorFilter) {
      list = list.filter(p => p.colorName.toLowerCase().includes(selectedColorFilter.toLowerCase()));
    }

    if (sortBy === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else {
      // featured
      list.sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0));
    }

    return list;
  }, [products, selectedCategoryFilter, selectedColorFilter, sortBy]);

  const pageTitle = selectedCategoryFilter === 'All' ? 'WALLETS & LEATHER GOODS' : selectedCategoryFilter.toUpperCase();

  return (
    <div className="w-full max-w-7xl lg:max-w-none mx-auto px-4 sm:px-6 lg:px-10 xl:px-14 py-10 lg:py-16 space-y-12">
      
      {/* Breadcrumb */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-xs text-[#8c857d] flex items-center space-x-2"
      >
        <span onClick={() => setCurrentScreen('home')} className="hover:text-[#181614] cursor-pointer transition-colors">Home</span>
        <span>›</span>
        <span onClick={() => setSelectedCategoryFilter('All')} className="hover:text-[#181614] cursor-pointer transition-colors">Shop</span>
        <span>›</span>
        <span className="text-[#181614] font-medium">{selectedCategoryFilter}</span>
      </motion.nav>

      {/* Hero Category Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center space-y-3 max-w-2xl mx-auto"
      >
        <h1 className="font-serif-luxury text-4xl sm:text-5xl font-bold tracking-tight text-[#181614]">
          {pageTitle}
        </h1>
        <p className="text-sm sm:text-base text-[#696159] leading-relaxed">
          Designed for the essentials. Crafted for years of enduring character.
        </p>
      </motion.div>

      {/* Mobile Filter Toggle */}
      <div className="md:hidden flex items-center justify-between py-3 border-y border-[#ece4d8]">
        <button
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#181614]"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#8c562e]" />
          <span>Filters ({selectedCategoryFilter !== 'All' ? '1' : '0'})</span>
        </button>
        <span className="text-xs text-[#8c857d]">Showing {filteredProducts.length} Pieces</span>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Left Sidebar Filters */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`md:col-span-3 space-y-8 ${mobileFilterOpen ? 'block' : 'hidden md:block'}`}
        >
          
          <div className="space-y-6 pb-6 border-b border-[#ece4d8]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#181614]">
              Refine Collection
            </h3>

            {/* Category Filter */}
            <div className="space-y-3">
              <div
                onClick={() => setCategoryFilterOpen(!categoryFilterOpen)}
                className="flex items-center justify-between cursor-pointer py-1 select-none"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-[#181614]">
                  Category
                </span>
                <span className="text-sm font-light text-[#8c857d]">{categoryFilterOpen ? '−' : '+'}</span>
              </div>

              {categoryFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 pt-1"
                >
                  {categories.map(cat => {
                    const isSelected = selectedCategoryFilter === cat.value;
                    return (
                      <motion.label
                        key={cat.value}
                        whileHover={{ x: 2 }}
                        onClick={() => setSelectedCategoryFilter(cat.value)}
                        className="flex items-center space-x-3 text-xs text-[#524b44] hover:text-black cursor-pointer group select-none transition-colors"
                      >
                        <div
                          className={`w-4 h-4 rounded-xs border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-[#8c562e] border-[#8c562e] text-white shadow-2xs'
                              : 'border-[#cfc5b6] group-hover:border-[#8c562e]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className={isSelected ? 'font-semibold text-[#181614]' : ''}>
                          {cat.label}
                        </span>
                      </motion.label>
                    );
                  })}
                </motion.div>
              )}
            </div>

            {/* Color Filter */}
            <div className="space-y-3 pt-4 border-t border-[#ece4d8]">
              <div
                onClick={() => setColorFilterOpen(!colorFilterOpen)}
                className="flex items-center justify-between cursor-pointer py-1 select-none"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-[#181614]">
                  Leather Tone
                </span>
                <span className="text-sm font-light text-[#8c857d]">{colorFilterOpen ? '−' : '+'}</span>
              </div>

              {colorFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="grid grid-cols-2 gap-2 pt-1"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedColorFilter('')}
                    className={`text-left px-2.5 py-1.5 rounded-xs text-xs border transition-colors ${
                      !selectedColorFilter ? 'bg-[#181614] text-white border-[#181614]' : 'border-[#ded4c6] text-[#524b44] hover:border-[#8c562e]'
                    }`}
                  >
                    All Tones
                  </motion.button>
                  {colors.map(col => {
                    const isSelected = selectedColorFilter.toLowerCase() === col.name.toLowerCase();
                    return (
                      <motion.button
                        key={col.name}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedColorFilter(isSelected ? '' : col.name)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xs text-xs border transition-colors ${
                          isSelected
                            ? 'bg-[#f6f2ea] border-[#8c562e] font-semibold text-[#181614] shadow-2xs'
                            : 'border-[#ded4c6] text-[#524b44] hover:border-[#8c562e]'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-black/10"
                          style={{ backgroundColor: col.hex }}
                        />
                        <span>{col.name}</span>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </div>

            {/* Reset Filters */}
            {(selectedCategoryFilter !== 'All' || selectedColorFilter) && (
              <motion.button
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  setSelectedCategoryFilter('All');
                  setSelectedColorFilter('');
                }}
                className="text-xs text-[#8c562e] hover:text-[#734320] underline font-medium pt-2 block cursor-pointer transition-colors"
              >
                Clear all active filters
              </motion.button>
            )}

          </div>

        </motion.aside>

        {/* Right Product Grid */}
        <main className="md:col-span-9 space-y-8">
          
          {/* Header Row: Showing Count & Sort Dropdown */}
          <div className="flex items-center justify-between pb-4 border-b border-[#ece4d8]">
            <span className="text-xs font-medium text-[#736c64]">
              Showing <span className="font-semibold text-[#181614]">{filteredProducts.length}</span> Pieces
            </span>

            <div className="flex items-center space-x-3 text-xs">
              <span className="text-[#8c857d]">Sort By:</span>
              <select
                id="sort-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-[#f6f2ea] border border-[#ded4c6] px-3 py-1.5 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e] cursor-pointer transition-colors"
              >
                <option value="featured">Featured Collection</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Product Cards Grid with Staggered Scroll Reveals */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {filteredProducts.map((product, idx) => (
              <ShopProductCard
                key={product.id}
                product={product}
                idx={idx}
                isWishlisted={userProfile.wishlistProductIds.includes(product.id)}
                onOpenProduct={openProductBySlug}
                onAddToCart={addToCart}
                onToggleWishlist={toggleWishlist}
              />
            ))}
          </div>

        </main>

      </div>

    </div>
  );
};
