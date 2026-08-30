import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Heart, ShoppingBag, Star, ArrowRight, Sparkles } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { formatINR } from '../utils/formatCurrency';
import { Product } from '../types';

interface RelatedProductsSectionProps {
  currentProduct: Product;
}

export const RelatedProductsSection: React.FC<RelatedProductsSectionProps> = ({ currentProduct }) => {
  const { 
    products, 
    openProductBySlug, 
    addToCart, 
    userProfile, 
    toggleWishlist, 
    setSelectedCategoryFilter, 
    setCurrentScreen 
  } = useShop();

  // Dynamically compute 4–6 active/in-stock products from the same category
  const relatedProducts = useMemo(() => {
    if (!products || products.length === 0 || !currentProduct) return [];

    // Exclude currently viewed product and ensure item is in stock
    const availableProducts = products.filter(
      p => p.id !== currentProduct.id && (p.inStock !== false && (p.stockQuantity === undefined || p.stockQuantity > 0))
    );

    // 1. Exact category matches (e.g. 'Bifold Wallets', 'Cardholders', etc.)
    const exactMatches = availableProducts.filter(
      p => p.category && p.category.toLowerCase().trim() === currentProduct.category.toLowerCase().trim()
    );

    // If we have 4 or more exact matches, take up to 6
    if (exactMatches.length >= 4) {
      return exactMatches.slice(0, 6);
    }

    // If we have between 1 and 3 exact matches:
    // If the category is a wallet variation (e.g. Bifold Wallets, Cardholders, Travel Wallets),
    // we can supplement with closely related leather goods to ensure 4-6 pieces if available,
    // while prioritizing exact same-category products first.
    const isWalletCategory = /wallet|card|bifold|pocket|holder/i.test(currentProduct.category || '');
    
    let supplementaryMatches: Product[] = [];
    if (isWalletCategory) {
      supplementaryMatches = availableProducts.filter(
        p => !exactMatches.some(em => em.id === p.id) &&
             /wallet|card|bifold|pocket|holder/i.test(p.category || '')
      );
    }

    const combined = [...exactMatches, ...supplementaryMatches];
    
    // If combined still has fewer than 4, include other in-stock items from the collection
    if (combined.length < 4) {
      const otherStock = availableProducts.filter(
        p => !combined.some(c => c.id === p.id)
      );
      const fullSet = [...combined, ...otherStock];
      // If total products in catalogue is less than 4, return whatever is available
      return fullSet.slice(0, Math.min(6, Math.max(exactMatches.length, 4)));
    }

    return combined.slice(0, 6);
  }, [products, currentProduct]);

  // If no products exist at all, return null or empty state
  if (!products || products.length === 0) {
    return (
      <section className="pt-16 border-t border-[#ece4d8] animate-pulse">
        <div className="h-6 w-48 bg-[#eae3d5] rounded-xs mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="aspect-4/5 bg-[#f3ede3] rounded-xs" />
          ))}
        </div>
      </section>
    );
  }

  if (relatedProducts.length === 0) {
    return null;
  }

  const handleExploreCategory = () => {
    if (currentProduct.category) {
      setSelectedCategoryFilter(currentProduct.category);
    } else {
      setSelectedCategoryFilter('All');
    }
    setCurrentScreen('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section 
      id="related-products-section" 
      aria-label="Related Products"
      className="pt-16 pb-8 border-t border-[#ece4d8] space-y-8"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#8c562e]">
            <Sparkles className="w-3.5 h-3.5 text-[#8c562e]" />
            <span>Curated Atelier Recommendations</span>
          </div>
          <h2 className="font-serif-luxury text-2xl sm:text-3xl font-bold tracking-tight text-[#181614]">
            Related Creations
          </h2>
          <p className="text-xs sm:text-sm text-[#736a61] max-w-xl">
            Explore complementary pieces from the {currentProduct.category} collection, handcrafted with the same devotion to vegetable-tanned longevity.
          </p>
        </div>

        <button
          onClick={handleExploreCategory}
          className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8c562e] hover:text-[#181614] transition-colors cursor-pointer self-start sm:self-auto py-1"
        >
          <span>View All {currentProduct.category}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Dynamic Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedProducts.map((product, idx) => {
          const isWishlisted = userProfile.wishlistProductIds.includes(product.id);
          const effectivePrice = product.price || product.sellingPrice || 0;
          const effectiveMrp = product.originalPrice || product.mrp || 0;
          const hasDiscount = effectiveMrp > effectivePrice;
          const discountPercent = hasDiscount ? Math.round(((effectiveMrp - effectivePrice) / effectiveMrp) * 100) : 0;
          const primaryImage = product.images && product.images.length > 0 ? product.images[0] : '';

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.45, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="group flex flex-col justify-between bg-white border border-[#ece4d8] rounded-xs overflow-hidden shadow-2xs hover:shadow-xl hover:border-[#cfc2b0] transition-all duration-300"
            >
              {/* Product Image & Badges */}
              <div className="relative aspect-4/5 w-full bg-[#f6f2ea] overflow-hidden">
                {product.badge && (
                  <span className={`absolute top-2.5 left-2.5 z-10 px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase shadow-2xs ${
                    product.badge === 'NEW'
                      ? 'bg-[#d4af37] text-[#0c0a09]'
                      : product.badge === 'BEST SELLER' || product.badge === 'BESTSELLER'
                      ? 'bg-[#181614] text-white'
                      : 'bg-white/95 text-[#181614] backdrop-blur-xs'
                  }`}>
                    {product.badge}
                  </span>
                )}

                {hasDiscount && !product.badge && (
                  <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 bg-[#8c562e] text-white text-[9px] font-bold tracking-wider uppercase shadow-2xs">
                    {discountPercent}% OFF
                  </span>
                )}

                {/* Wishlist Button */}
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWishlist(product.id);
                  }}
                  className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full bg-white/85 hover:bg-white text-[#78716c] hover:text-[#8c562e] transition-colors shadow-2xs cursor-pointer"
                  title="Admire item"
                  aria-label={`Add ${product.name} to wishlist`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-[#8c562e] text-[#8c562e]' : ''}`} />
                </motion.button>

                {/* Image */}
                <img
                  src={primaryImage}
                  alt={`${product.name} - Handcrafted ${product.material || 'luxury leather'} in ${product.colorName}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 ease-out cursor-pointer"
                  onClick={() => openProductBySlug(product.slug || product.id)}
                />

                {/* Quick Action Overlay on Hover */}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/75 via-black/35 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 flex gap-2 z-10">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => openProductBySlug(product.slug || product.id)}
                    className="flex-1 py-2 bg-white/95 hover:bg-white text-black text-[10px] font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
                  >
                    Inspect Piece
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product, 1);
                    }}
                    className="p-2 bg-[#8c562e] hover:bg-black text-white text-[10px] transition-colors shadow-xs cursor-pointer"
                    title="Add to Bag"
                    aria-label={`Add ${product.name} to bag`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>

              {/* Product Metadata */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3
                      onClick={() => openProductBySlug(product.slug || product.id)}
                      className="font-serif-luxury text-sm font-semibold text-[#181614] group-hover:text-[#8c562e] transition-colors cursor-pointer leading-tight"
                    >
                      {product.name}
                    </h3>
                    <div className="text-right whitespace-nowrap">
                      {hasDiscount && (
                        <span className="text-[11px] text-[#8c857d] line-through block leading-none mb-0.5">
                          {formatINR(effectiveMrp)}
                        </span>
                      )}
                      <span className="font-serif-luxury text-sm font-semibold text-[#181614]">
                        {formatINR(effectivePrice)}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#78716c] mt-0.5">
                    {product.colorName || product.material || currentProduct.category}
                  </p>
                </div>

                {/* Rating & In-Stock Status */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-[#78716c]">
                  <div className="flex items-center gap-1">
                    <div className="flex items-center text-[#d4af37]">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < Math.floor(product.rating || 5) ? 'fill-[#d4af37]' : 'text-[#ded5c7]'}`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px]">({product.reviewsCount || 0})</span>
                  </div>

                  <span className="text-[10px] font-medium text-[#8c562e]">
                    {product.category}
                  </span>
                </div>

              </div>

            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
