import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, 
  Heart, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  User, 
  CheckCircle2, 
  MessageSquare, 
  Send, 
  Lock,
  ShieldCheck,
  Share2
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { formatINR } from '../utils/formatCurrency';
import { DEFAULT_PRODUCT_REVIEWS } from '../data/mockData';
import { ProductReview } from '../types';
import { RelatedProductsSection } from './RelatedProductsSection';
import { applyProductSEO, resetDefaultSEO, getProductCanonicalUrl } from '../utils/seoHelper';

export const ProductDetailScreen: React.FC = () => {
  const { 
    selectedProduct, 
    addToCart, 
    userProfile, 
    toggleWishlist, 
    setCurrentScreen, 
    isLoggedIn, 
    openAuthModal, 
    addProductReview, 
    showToast 
  } = useShop();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [openAccordion, setOpenAccordion] = useState<string | null>('materials');

  // Dynamic Product SEO: Updates <title>, meta description, canonical URL, OpenGraph, Twitter card, and Schema.org JSON-LD
  useEffect(() => {
    if (selectedProduct) {
      applyProductSEO(selectedProduct);
    }
    return () => {
      resetDefaultSEO();
    };
  }, [selectedProduct]);

  // Review Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [activeRatingFilter, setActiveRatingFilter] = useState<number | 'all'>('all');

  const isWishlisted = userProfile.wishlistProductIds.includes(selectedProduct.id);

  // Dynamic 4-day delivery estimate calculation based on current date
  const deliveryEstimateText = React.useMemo(() => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 4);
    const day = targetDate.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[targetDate.getMonth()];
    const year = targetDate.getFullYear();
    return `Delivery till ${day} ${month} ${year}`;
  }, []);

  // Reviews data (from product or fallback defaults)
  const productReviews: ProductReview[] = selectedProduct.reviews && selectedProduct.reviews.length > 0
    ? selectedProduct.reviews
    : (DEFAULT_PRODUCT_REVIEWS[selectedProduct.id] || [
        {
          id: `rev-default-${selectedProduct.id}-1`,
          productId: selectedProduct.id,
          authorName: 'A. Sterling',
          authorAvatar: 'AS',
          rating: 5,
          title: 'Exemplary craftsmanship and unmatched leather feel',
          comment: `The quality of the ${selectedProduct.name} is sublime. The stitching is mathematically precise and the leather scent is authentic vegetable-tanned Italian grain.`,
          date: 'Jan 15, 2025',
          verifiedPurchase: true,
        },
        {
          id: `rev-default-${selectedProduct.id}-2`,
          productId: selectedProduct.id,
          authorName: 'Julian Hayes',
          authorAvatar: 'JH',
          rating: 5,
          title: 'A true heirloom everyday carry',
          comment: 'Fits comfortably in tailored pockets. The burnished edges and rich depth of color exceed expectations.',
          date: 'Dec 22, 2024',
          verifiedPurchase: true,
        }
      ]);

  // Filtered reviews
  const filteredReviews = activeRatingFilter === 'all'
    ? productReviews
    : productReviews.filter(r => r.rating === activeRatingFilter);

  // Rating breakdown counts
  const ratingCounts = {
    5: productReviews.filter(r => r.rating === 5).length,
    4: productReviews.filter(r => r.rating === 4).length,
    3: productReviews.filter(r => r.rating === 3).length,
    2: productReviews.filter(r => r.rating === 2).length,
    1: productReviews.filter(r => r.rating === 1).length,
  };
  const totalReviewsCount = productReviews.length;

  const toggleSection = (section: string) => {
    setOpenAccordion(openAccordion === section ? null : section);
  };

  const handleAdd = () => {
    addToCart(selectedProduct, 1);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      openAuthModal('login', undefined, 'Sign in to share your review on this bespoke piece');
      return;
    }

    if (!reviewTitle.trim()) {
      showToast('Please enter a review headline');
      return;
    }

    if (!reviewComment.trim()) {
      showToast('Please enter your review comments');
      return;
    }

    setIsSubmittingReview(true);
    const success = await addProductReview(selectedProduct.id, {
      rating,
      title: reviewTitle.trim(),
      comment: reviewComment.trim(),
    });

    setIsSubmittingReview(false);
    if (success) {
      setReviewTitle('');
      setReviewComment('');
      setRating(5);
    }
  };

  const ratingLabels: Record<number, string> = {
    5: '5 Stars — Exceptional Masterpiece',
    4: '4 Stars — Highly Commended Quality',
    3: '3 Stars — Standard Craftsmanship',
    2: '2 Stars — Below Expectations',
    1: '1 Star — Unsatisfactory',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-16">
      
      {/* Breadcrumbs */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-xs text-[#8c857d] flex items-center space-x-2"
      >
        <span onClick={() => setCurrentScreen('home')} className="hover:text-[#181614] cursor-pointer transition-colors">Home</span>
        <span>›</span>
        <span onClick={() => setCurrentScreen('shop')} className="hover:text-[#181614] cursor-pointer transition-colors">Shop</span>
        <span>›</span>
        <span onClick={() => setCurrentScreen('shop')} className="hover:text-[#181614] cursor-pointer transition-colors">{selectedProduct.category}</span>
        <span>›</span>
        <span className="text-[#181614] font-medium">{selectedProduct.name}</span>
      </motion.nav>

      {/* Main PDP Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        
        {/* Left Column: Vertical Image Stream / Hero Imagery */}
        <motion.div
          initial={{ opacity: 0, x: -25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 space-y-6"
        >
          
          {/* Main Large Image (Swipeable on Mobile & Tablet, Static Carousel on Desktop) */}
          <div className="relative w-full bg-[#f4eee5] overflow-hidden rounded-xs border border-[#e4d9cb] shadow-sm group">
            
            {/* Mobile & Tablet: Native Horizontal Swipeable Scroll Container */}
            <div className="flex lg:hidden overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth">
              {selectedProduct.images.map((img, idx) => (
                <div 
                  key={idx} 
                  className="w-full shrink-0 aspect-3/4 sm:aspect-4/5 snap-center relative"
                >
                  <img
                    src={img}
                    alt={`${selectedProduct.name} - Handcrafted ${selectedProduct.material || 'leather'} in ${selectedProduct.colorName} - View ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center"
                  />
                  {selectedProduct.images.length > 1 && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-[10px] font-mono tracking-wider font-semibold">
                      {idx + 1} / {selectedProduct.images.length}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop (lg+): Full Animated Presentation */}
            <div className="hidden lg:block relative aspect-3/4 lg:aspect-4/5 w-full">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImageIndex}
                  src={selectedProduct.images[activeImageIndex] || selectedProduct.images[0]}
                  alt={`${selectedProduct.name} - Luxury Handcrafted ${selectedProduct.category} in ${selectedProduct.colorName}`}
                  referrerPolicy="no-referrer"
                  initial={{ opacity: 0.4, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0.4 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="w-full h-full object-cover object-center"
                />
              </AnimatePresence>

              {/* Left/Right Carousel Nav Arrows on Desktop */}
              {selectedProduct.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => (prev === 0 ? selectedProduct.images.length - 1 : prev - 1));
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => (prev === selectedProduct.images.length - 1 ? 0 : prev + 1));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Angle Indicator Pill on Desktop */}
                  <div className="absolute top-4 right-4 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-[10px] font-mono tracking-wider font-semibold">
                    {activeImageIndex + 1} / {selectedProduct.images.length}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Multi-Angle Gallery Thumbnails (Scrollable on Mobile & Tablet, Grid on Desktop) */}
          {selectedProduct.images.length > 1 && (
            <div className="flex lg:grid overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 gap-3 sm:gap-4 snap-x snap-mandatory scrollbar-none lg:grid-cols-4">
              {selectedProduct.images.map((img, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative shrink-0 w-24 sm:w-28 lg:w-full aspect-4/3 rounded-xs overflow-hidden border transition-all cursor-pointer snap-start ${
                    activeImageIndex === idx
                      ? 'border-[#8c562e] ring-2 ring-[#8c562e]/40 shadow-sm opacity-100'
                      : 'border-[#e4d9cb] hover:border-[#8c857d] opacity-80 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${selectedProduct.name} angle ${idx + 1} - ${selectedProduct.colorName}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-[#181614]/80 text-[#f5f1eb] text-[9px] font-semibold tracking-wide rounded-xs">
                    {idx === 0 ? 'Hero' : `Angle ${idx + 1}`}
                  </div>
                </motion.button>
              ))}
            </div>
          )}

        </motion.div>

        {/* Right Column: Product Details, Actions & Accordions */}
        <motion.div
          initial={{ opacity: 0, x: 25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 flex flex-col justify-between space-y-8"
        >
          
          <div className="space-y-6">
            
            {/* Title & Price */}
            <div className="border-b border-[#ece4d8] pb-6 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#8c562e]">
                  {selectedProduct.category}
                </span>
                <span className="text-[#ded5c7]">•</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-xs bg-[#f6f2ea] border border-[#ded5c7] font-mono text-[11px] font-bold text-[#181614]">
                  SKU: {selectedProduct.sku || selectedProduct.skuId || 'SB-PROD-001'}
                </span>
                {selectedProduct.badge && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#181614] text-[#d4af37]">
                    {selectedProduct.badge}
                  </span>
                )}
              </div>

              <div className="flex justify-between items-start gap-4">
                <h1 className="font-serif-luxury text-3xl sm:text-4xl font-semibold text-[#181614] flex-1">
                  {selectedProduct.name}
                </h1>
                <div className="flex items-center gap-1 shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      const url = getProductCanonicalUrl(selectedProduct);
                      if (navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(url).then(() => {
                          showToast('Bespoke product link copied to clipboard');
                        }).catch(() => {
                          showToast(`Product URL: ${url}`);
                        });
                      } else {
                        showToast(`Product URL: ${url}`);
                      }
                    }}
                    className="p-2 text-[#8c857d] hover:text-[#8c562e] transition-colors cursor-pointer"
                    title="Share / Copy product link"
                    aria-label="Share product link"
                  >
                    <Share2 className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleWishlist(selectedProduct.id)}
                    className="p-2 text-[#8c857d] hover:text-[#8c562e] transition-colors cursor-pointer"
                    title={isWishlisted ? 'Remove from Admired' : 'Save to Admired'}
                    aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <Heart className={`w-6 h-6 ${isWishlisted ? 'fill-[#8c562e] text-[#8c562e]' : ''}`} />
                  </motion.button>
                </div>
              </div>

              {/* Rating summary link */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center text-[#d4af37]">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.floor(selectedProduct.rating)
                          ? 'fill-[#d4af37] text-[#d4af37]'
                          : 'fill-transparent text-[#d4af37]'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-[#181614]">{selectedProduct.rating.toFixed(1)}</span>
                <span className="text-[#8c857d]">•</span>
                <a
                  href="#customer-reviews-section"
                  className="text-[#8c562e] hover:underline font-medium cursor-pointer"
                >
                  {totalReviewsCount} {totalReviewsCount === 1 ? 'Patron Review' : 'Patron Reviews'}
                </a>
              </div>

              {/* Product Price Display with dynamic MRP strikethrough */}
              {(() => {
                const mrp = selectedProduct.mrp ?? selectedProduct.originalPrice ?? selectedProduct.original_price;
                const sellingPrice = selectedProduct.sellingPrice ?? selectedProduct.price;
                const hasValidDiscount = typeof mrp === 'number' && mrp > sellingPrice;
                const discountPercent = hasValidDiscount ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;
                const savingsAmount = hasValidDiscount ? mrp - sellingPrice : 0;

                return (
                  <div className="flex flex-wrap items-baseline gap-2.5 sm:gap-3 pt-1">
                    {hasValidDiscount && (
                      <span className="font-serif-luxury text-lg sm:text-xl text-[#8c857d] line-through font-normal">
                        {formatINR(mrp)}
                      </span>
                    )}
                    <span className="font-serif-luxury text-2xl sm:text-3xl font-semibold text-[#181614]">
                      {formatINR(sellingPrice)}
                    </span>
                    {hasValidDiscount && discountPercent > 0 && (
                      <span className="text-xs font-bold text-[#8c562e] bg-[#fbf2e9] border border-[#e8d5c4] px-2 py-0.5 rounded-xs tracking-wide">
                        {discountPercent}% OFF
                      </span>
                    )}
                    <span className="text-xs text-[#8c857d] font-medium">(Incl. of all taxes)</span>
                  </div>
                );
              })()}

              <p className="text-sm text-[#5c544d] leading-relaxed pt-1">
                {selectedProduct.description}
              </p>
            </div>

            {/* PRODUCT HIGHLIGHTS SPECIFICATION CARD */}
            {((selectedProduct.productHighlights && selectedProduct.productHighlights.length > 0) || selectedProduct.material) && (
              <div className="p-4 bg-[#fbf9f5] border border-[#e4d9cb] rounded-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#e4dcd0] pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#181614] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#8c562e]" />
                    <span>Product Specifications</span>
                  </h4>
                  <span className="font-mono text-[10px] text-[#8c562e] font-semibold">
                    SKU: {selectedProduct.sku || selectedProduct.skuId || 'N/A'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {selectedProduct.productHighlights && selectedProduct.productHighlights.length > 0 ? (
                    selectedProduct.productHighlights.map((hl, hIdx) => (
                      <div key={hIdx} className="p-2 bg-white rounded-xs border border-[#eee7dc]">
                        <span className="text-[10px] uppercase tracking-wider text-[#8c857d] font-semibold block">
                          {hl.label}
                        </span>
                        <span className="text-xs font-medium text-[#181614] block mt-0.5">
                          {hl.value}
                        </span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="p-2 bg-white rounded-xs border border-[#eee7dc]">
                        <span className="text-[10px] uppercase tracking-wider text-[#8c857d] font-semibold block">Material</span>
                        <span className="text-xs font-medium text-[#181614] block mt-0.5">{selectedProduct.material}</span>
                      </div>
                      <div className="p-2 bg-white rounded-xs border border-[#eee7dc]">
                        <span className="text-[10px] uppercase tracking-wider text-[#8c857d] font-semibold block">Color</span>
                        <span className="text-xs font-medium text-[#181614] block mt-0.5">{selectedProduct.colorName}</span>
                      </div>
                      <div className="p-2 bg-white rounded-xs border border-[#eee7dc]">
                        <span className="text-[10px] uppercase tracking-wider text-[#8c857d] font-semibold block">Dimensions</span>
                        <span className="text-xs font-medium text-[#181614] block mt-0.5">{selectedProduct.dimensions || '4.2" x 3.2"'}</span>
                      </div>
                      <div className="p-2 bg-white rounded-xs border border-[#eee7dc]">
                        <span className="text-[10px] uppercase tracking-wider text-[#8c857d] font-semibold block">Craftsmanship</span>
                        <span className="text-xs font-medium text-[#181614] block mt-0.5">Hand-burnished Italian leather</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ACTION BUTTONS: ADD TO BAG & WISHLIST BUTTON */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Add to Bag Button */}
                <motion.button
                  id="add-to-bag-btn"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAdd}
                  className="flex-1 py-4 bg-black hover:bg-[#8c562e] text-white text-xs font-semibold uppercase tracking-[0.2em] transition-colors duration-200 shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Add to Bag</span>
                </motion.button>

                {/* Wishlist Button on Product Page */}
                <motion.button
                  id="product-wishlist-btn"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleWishlist(selectedProduct.id)}
                  className={`px-6 py-4 border text-xs font-semibold uppercase tracking-[0.15em] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 ${
                    isWishlisted
                      ? 'bg-[#f6f2ea] border-[#8c562e] text-[#8c562e] shadow-2xs'
                      : 'bg-white border-[#d8cfc0] hover:border-[#181614] text-[#181614] hover:bg-[#faf7f2]'
                  }`}
                  title={isWishlisted ? 'Saved in your Admired Pieces' : 'Save to your Admired Pieces'}
                >
                  <Heart className={`w-4 h-4 transition-transform duration-200 ${isWishlisted ? 'fill-[#8c562e] text-[#8c562e] scale-110' : 'text-[#8c562e]'}`} />
                  <span>{isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
                </motion.button>
              </div>

              {/* Delivery Estimate line directly below Wishlist button */}
              <div id="product-delivery-estimate" className="flex items-center justify-center sm:justify-start gap-2 text-xs font-medium text-[#2c2621] pt-1">
                <Truck className="w-3.5 h-3.5 text-[#8c562e] shrink-0" />
                <span>{deliveryEstimateText}</span>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-[#6e665e] pt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#8c562e] shrink-0" />
                <span>Complimentary Express Worldwide Shipping • 14-Day Atelier Returns</span>
              </div>
            </div>

          </div>

          {/* Details Accordion */}
          <div className="border-t border-[#ece4d8] pt-8 space-y-4">
            <h3 className="font-serif-luxury text-xl font-semibold text-[#181614] text-center mb-6">
              Crafted Details
            </h3>

            {/* Accordion 1: Materials & Construction */}
            <div className="border-b border-[#ece4d8] pb-4">
              <button
                onClick={() => toggleSection('materials')}
                className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-[#181614] hover:text-[#8c562e] transition-colors py-2 text-left cursor-pointer"
              >
                <span>Materials & Construction</span>
                <span className="text-base font-light">{openAccordion === 'materials' ? '−' : '+'}</span>
              </button>
              <AnimatePresence>
                {openAccordion === 'materials' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-[#6e665e] leading-relaxed pt-2 pb-1 space-y-2 overflow-hidden"
                  >
                    <p>{selectedProduct.materialsDetails}</p>
                    <p><strong>Dimensions:</strong> {selectedProduct.dimensions || '4.2" x 3.2"'}</p>
                    <p><strong>Origin:</strong> Hand-finished at the Tuscany Atelier, Italy.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Accordion 2: Care Instructions */}
            <div className="border-b border-[#ece4d8] pb-4">
              <button
                onClick={() => toggleSection('care')}
                className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-[#181614] hover:text-[#8c562e] transition-colors py-2 text-left cursor-pointer"
              >
                <span>Care Instructions</span>
                <span className="text-base font-light">{openAccordion === 'care' ? '−' : '+'}</span>
              </button>
              <AnimatePresence>
                {openAccordion === 'care' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-[#6e665e] leading-relaxed pt-2 pb-1 space-y-2 overflow-hidden"
                  >
                    <p>{selectedProduct.careInstructions}</p>
                    <p>Each order includes a complimentary 15ml pot of organic beeswax leather dressing.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Accordion 3: Shipping & Returns */}
            <div className="border-b border-[#ece4d8] pb-4">
              <button
                onClick={() => toggleSection('shipping')}
                className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-[#181614] hover:text-[#8c562e] transition-colors py-2 text-left cursor-pointer"
              >
                <span>Shipping & Atelier Guarantee</span>
                <span className="text-base font-light">{openAccordion === 'shipping' ? '−' : '+'}</span>
              </button>
              <AnimatePresence>
                {openAccordion === 'shipping' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-[#6e665e] leading-relaxed pt-2 pb-1 space-y-2 overflow-hidden"
                  >
                    <p>{selectedProduct.shippingInfo}</p>
                    <p>Lifetime guarantee on all hand-stitching and solid brass hardware components.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </motion.div>

      </div>

      {/* ========================================================================= */}
      {/* CUSTOMER REVIEWS & RATINGS SECTION */}
      {/* ========================================================================= */}
      <section id="customer-reviews-section" className="border-t border-[#ece4d8] pt-14 space-y-12">
        
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#8c562e]">
            Patron Impressions
          </span>
          <h2 className="font-serif-luxury text-3xl sm:text-4xl font-semibold text-[#181614]">
            Client Reviews & Ratings
          </h2>
          <p className="text-xs sm:text-sm text-[#736a61]">
            Verified experiences from patrons who carry our bespoke handcrafted leather goods.
          </p>
        </div>

        {/* Rating Overview Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-[#fbf9f5] border border-[#e4d9cb] p-6 sm:p-8 rounded-xs">
          
          {/* Overall Score */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-[#e4d9cb] pb-6 lg:pb-0 lg:pr-8 text-center space-y-3">
            <span className="font-serif-luxury text-5xl sm:text-6xl font-bold text-[#181614]">
              {selectedProduct.rating.toFixed(1)}
            </span>
            <div className="flex items-center text-[#d4af37] gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(selectedProduct.rating)
                      ? 'fill-[#d4af37] text-[#d4af37]'
                      : 'fill-transparent text-[#d4af37]'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-[#736a61] font-medium">
              Based on <strong className="text-[#181614]">{totalReviewsCount}</strong> verified patron {totalReviewsCount === 1 ? 'review' : 'reviews'}
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#ded5c7] rounded-full text-[11px] text-[#8c562e] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#8c562e]" />
              <span>100% Verified Atelier Purchases</span>
            </div>
          </div>

          {/* Rating Breakdown Bars */}
          <div className="lg:col-span-8 flex flex-col justify-center space-y-2.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingCounts[stars as keyof typeof ratingCounts] || 0;
              const percentage = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveRatingFilter(activeRatingFilter === stars ? 'all' : stars)}
                    className={`w-14 text-left font-medium cursor-pointer transition-colors ${
                      activeRatingFilter === stars ? 'text-[#8c562e] font-bold underline' : 'text-[#181614] hover:text-[#8c562e]'
                    }`}
                  >
                    {stars} Stars
                  </button>
                  <div className="flex-1 h-2.5 bg-[#eae3d5] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#8c562e] transition-all duration-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-gray-500 font-mono text-[11px]">
                    {percentage}%
                  </span>
                  <span className="w-8 text-right text-[#8c857d] font-mono text-[11px]">
                    ({count})
                  </span>
                </div>
              );
            })}
          </div>

        </div>

        {/* WRITE A REVIEW FORM / AUTH PROMPT */}
        <div className="bg-white border border-[#e4d9cb] p-6 sm:p-8 rounded-xs shadow-2xs">
          {isLoggedIn ? (
            <form onSubmit={handleReviewSubmit} className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#ece4d8] pb-4 gap-2">
                <div>
                  <h3 className="font-serif-luxury text-xl font-semibold text-[#181614] flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#8c562e]" />
                    <span>Submit Your Review</span>
                  </h3>
                  <p className="text-xs text-[#736a61] mt-0.5">
                    Share your experience with the materials, hand-stitching, and everyday utility.
                  </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f6f2ea] border border-[#e4d9cb] rounded-xs text-xs">
                  <div className="w-6 h-6 rounded-full bg-[#181614] text-white flex items-center justify-center font-serif text-[10px] font-bold">
                    {userProfile.avatarInitials || 'PA'}
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-[#181614] block leading-none">{userProfile.name}</span>
                    <span className="text-[10px] text-[#8c562e] font-medium leading-none">Verified Patron</span>
                  </div>
                </div>
              </div>

              {/* Interactive Star Rating Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block">
                  Overall Rating *
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5" onMouseLeave={() => setHoverRating(0)}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = (hoverRating || rating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          className="p-1 text-[#d4af37] hover:scale-125 transition-transform cursor-pointer"
                          aria-label={`Rate ${star} star`}
                        >
                          <Star
                            className={`w-6 h-6 ${
                              isFilled ? 'fill-[#d4af37] text-[#d4af37]' : 'fill-transparent text-[#d4af37]'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs font-medium text-[#8c562e] pl-2">
                    {ratingLabels[hoverRating || rating]}
                  </span>
                </div>
              </div>

              {/* Review Title Input */}
              <div className="space-y-1.5">
                <label htmlFor="review-title" className="text-xs font-semibold uppercase tracking-wider text-[#181614] block">
                  Review Headline *
                </label>
                <input
                  id="review-title"
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="e.g., Unmatched leather aroma and timeless Tuscan craft"
                  required
                  className="w-full bg-[#fcfbf9] border border-[#d6cbba] px-4 py-2.5 text-sm text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e] focus:bg-white transition-colors"
                />
              </div>

              {/* Review Comment Textarea */}
              <div className="space-y-1.5">
                <label htmlFor="review-comment" className="text-xs font-semibold uppercase tracking-wider text-[#181614] block">
                  Your Detailed Impressions *
                </label>
                <textarea
                  id="review-comment"
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Describe the patina, hand-feel, pocket carry, stitching, and packaging experience..."
                  required
                  className="w-full bg-[#fcfbf9] border border-[#d6cbba] px-4 py-3 text-sm text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e] focus:bg-white transition-colors leading-relaxed resize-y"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end">
                <motion.button
                  type="submit"
                  disabled={isSubmittingReview}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-3 bg-black hover:bg-[#8c562e] disabled:bg-gray-400 text-white text-xs font-semibold uppercase tracking-[0.2em] transition-colors cursor-pointer shadow-sm flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingReview ? 'Publishing...' : 'Post Patron Review'}</span>
                </motion.button>
              </div>

            </form>
          ) : (
            <div className="text-center py-6 px-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#f6f2ea] border border-[#e4d9cb] text-[#8c562e] flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-serif-luxury text-lg font-semibold text-[#181614]">
                  Share Your Experience With This Piece
                </h4>
                <p className="text-xs text-[#736a61] leading-relaxed">
                  Sign in to your patron account to leave an authenticated review and share your feedback on the craft with fellow connoisseurs.
                </p>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openAuthModal('login', undefined, 'Sign in to share your review on this bespoke piece')}
                className="px-8 py-3 bg-[#181614] hover:bg-[#8c562e] text-white text-xs font-semibold uppercase tracking-[0.15em] transition-colors cursor-pointer shadow-sm inline-flex items-center gap-2"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In to Write a Review</span>
              </motion.button>
            </div>
          )}
        </div>

        {/* Filter Pills & Reviews Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ece4d8] pb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-serif-luxury text-xl font-semibold text-[#181614]">
              Patron Testimonials
            </h3>
            <span className="px-2 py-0.5 bg-[#f6f2ea] border border-[#ded5c7] rounded-full text-[11px] font-mono font-bold text-[#8c562e]">
              {filteredReviews.length}
            </span>
          </div>

          {/* Star Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <button
              onClick={() => setActiveRatingFilter('all')}
              className={`px-3 py-1.5 rounded-xs transition-colors cursor-pointer font-medium whitespace-nowrap ${
                activeRatingFilter === 'all'
                  ? 'bg-[#181614] text-white'
                  : 'bg-[#f6f2ea] text-[#5c544d] hover:bg-[#eae3d5]'
              }`}
            >
              All ({totalReviewsCount})
            </button>
            {[5, 4, 3, 2, 1].map((st) => {
              const count = ratingCounts[st as keyof typeof ratingCounts] || 0;
              return (
                <button
                  key={st}
                  onClick={() => setActiveRatingFilter(st)}
                  className={`px-3 py-1.5 rounded-xs transition-colors cursor-pointer font-medium whitespace-nowrap flex items-center gap-1 ${
                    activeRatingFilter === st
                      ? 'bg-[#8c562e] text-white'
                      : 'bg-[#f6f2ea] text-[#5c544d] hover:bg-[#eae3d5]'
                  }`}
                >
                  <span>{st}★</span>
                  <span className="text-[10px] opacity-80">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reviews Cards List */}
        <div className="space-y-4">
          {filteredReviews.length > 0 ? (
            filteredReviews.map((rev) => (
              <motion.div
                key={rev.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white border border-[#ece4d8] p-6 rounded-xs space-y-3 shadow-2xs hover:border-[#cfc2b0] transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#181614] text-white flex items-center justify-center font-serif text-xs font-bold shadow-2xs">
                      {rev.authorAvatar || rev.authorName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#181614]">{rev.authorName}</span>
                        {rev.verifiedPurchase && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#f6f2ea] border border-[#ded5c7] rounded-xs text-[9px] font-semibold text-[#8c562e]">
                            <CheckCircle2 className="w-2.5 h-2.5 text-[#8c562e]" />
                            <span>Verified Patron</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#8c857d]">{rev.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center text-[#d4af37]">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.rating
                            ? 'fill-[#d4af37] text-[#d4af37]'
                            : 'fill-transparent text-[#d4af37]'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <h4 className="text-sm font-semibold text-[#181614]">
                    {rev.title}
                  </h4>
                  <p className="text-xs text-[#5c544d] leading-relaxed">
                    {rev.comment}
                  </p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 bg-[#fbf9f5] border border-dashed border-[#d8cfc0] rounded-xs space-y-2">
              <MessageSquare className="w-8 h-8 text-[#8c857d] mx-auto opacity-50" />
              <h4 className="font-serif-luxury text-base font-semibold text-[#181614]">
                No reviews found for this rating
              </h4>
              <p className="text-xs text-[#736a61]">
                Try selecting "All" to view all reviews for this handcrafted piece.
              </p>
            </div>
          )}
        </div>

      </section>

      {/* Dynamic Related Products / Complementary Pieces Section */}
      <RelatedProductsSection currentProduct={selectedProduct} />

    </div>
  );
};
