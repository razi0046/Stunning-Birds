import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Check, ShieldCheck, Compass, Feather } from 'lucide-react';
import { motion } from 'motion/react';
import { useShop } from '../context/ShopContext';
import { formatINR } from '../utils/formatCurrency';
import { resetDefaultSEO } from '../utils/seoHelper';
import tacticalWalletMaterialsImg from '../assets/images/technical_wallet_materials.jpg';
import artisanSaddleStitchImg from '../assets/images/artisan_saddle_stitch.jpg';
import beveledLeatherWalletImg from '../assets/images/beveled_leather_wallet.jpg';
import darkVelvetWalletImg from '../assets/images/dark_velvet_wallet.jpg';

export const HomeScreen: React.FC = () => {
  const { products, setCurrentScreen, openProductBySlug, setSelectedCategoryFilter, showToast } = useShop();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    resetDefaultSEO('home');
  }, []);

  const featuredProducts = products.slice(0, 4);
  const newAdditionProducts = products.length > 4 
    ? products.slice(4, 8) 
    : products.filter(p => p.badge === 'NEW' || p.isNewArrival);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;
    try {
      await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail }),
      });
    } catch {}
    setSubscribed(true);
    showToast('Welcome to the Stunning Birds Journal.');
    setNewsletterEmail('');
  };

  // Animation variants for staggered scroll reveal
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 36 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.21, 0.47, 0.32, 0.98],
      },
    },
  };

  return (
    <div className="w-full bg-[#faf8f5] text-[#2c2825] overflow-hidden">
      
      {/* 1. HERO SECTION WITH RICH LOAD TRANSITIONS */}
      <section className="relative w-full min-h-[620px] sm:min-h-[700px] lg:min-h-[760px] flex items-center justify-center overflow-hidden">
        {/* Background Image of artisan leather wallet with smooth initial zoom out */}
        <motion.div
          initial={{ scale: 1.1, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.25, 1, 0.5, 1] }}
          className="absolute inset-0 z-0"
        >
          <img
            src="https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=2400&q=85"
            alt="Handcrafted leather wallet on natural linen"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
          />
          {/* Rich warm twilight dark overlay for typography contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/40" />
        </motion.div>

        {/* Hero Content with staggered fade-in animations on page load */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center text-white py-24 space-y-6">
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 backdrop-blur-md border border-white/20 text-[#e8dfd3] text-[11px] font-medium tracking-widest uppercase rounded-full shadow-xs"
          >
            <Sparkles className="w-3 h-3 text-[#d4af37] animate-pulse" />
            <span>The Permanent Collection</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif-luxury text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#faf7f2] leading-[1.1] max-w-3xl mx-auto"
          >
            Made to Be Carried.<br />
            Made to Last.
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55, ease: 'easeOut' }}
            className="max-w-xl mx-auto text-base sm:text-lg text-[#ece6dc] font-normal leading-relaxed opacity-95"
          >
            Crafted from full-grain leather, designed for the quiet moments and the long journeys. Every piece tells a story.
          </motion.p>

          {/* Call to action buttons with micro-interactions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: 'easeOut' }}
            className="flex flex-row items-center justify-center gap-4 pt-4"
          >
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.98 }}
              id="hero-shop-collection-btn"
              onClick={() => {
                setSelectedCategoryFilter('All');
                setCurrentScreen('shop');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-8 py-3.5 bg-[#8c562e] hover:bg-[#744523] text-white text-xs font-semibold uppercase tracking-[0.2em] transition-colors shadow-md hover:shadow-xl cursor-pointer"
            >
              Shop Collection
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.98 }}
              id="hero-our-story-btn"
              onClick={() => {
                const el = document.getElementById('story-materials-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-[0.2em] transition-colors border border-white/40 backdrop-blur-xs cursor-pointer"
            >
              Our Story
            </motion.button>
          </motion.div>
        </div>

        {/* Bottom Banner Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9, ease: 'easeOut' }}
          className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-md border-t border-white/10 py-3 hidden sm:block"
        >
          <div className="max-w-6xl mx-auto px-4 flex justify-around text-xs tracking-wider text-[#e6dfd5] uppercase">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
              Full-Grain Italian Leather
            </span>
            <span className="flex items-center gap-2">
              <Feather className="w-3.5 h-3.5 text-[#d4af37]" />
              Traditional Saddle Stitching
            </span>
            <span className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-[#d4af37]" />
              Complimentary Courier
            </span>
          </div>
        </motion.div>
      </section>

      {/* 2. DARK SECTION: FEATURED OBJECTS OF PERMANENCE (SCROLL REVEAL) */}
      <section className="bg-[#0c0a09] text-[#f7f4ee] py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-20">
          
          {/* Header Row */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10"
            >
              <div>
                <h2 className="font-serif-luxury text-3xl sm:text-4xl font-bold tracking-tight text-[#faf8f5]">
                  Objects of Permanence
                </h2>
                <p className="text-sm text-[#a8a199] mt-1 max-w-xl">
                  Objects of permanence. Thoughtfully designed to patina beautifully alongside your daily rituals.
                </p>
              </div>
              <button
                id="view-all-shop-btn"
                onClick={() => {
                  setSelectedCategoryFilter('All');
                  setCurrentScreen('shop');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group relative inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#d4af37] hover:text-white transition-colors cursor-pointer py-1"
              >
                <span>View All Collection</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#d4af37] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </button>
            </motion.div>

            {/* Dynamic Cards Grid with Staggered Scroll Animation */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8"
            >
              {featuredProducts.length > 0 ? (
                featuredProducts.map((prod, idx) => (
                  <motion.div
                    key={prod.id || prod.slug || `featured-prod-${idx}`}
                    variants={cardVariants}
                    whileHover={{ y: -6, transition: { duration: 0.3 } }}
                    onClick={() => openProductBySlug(prod.slug || prod.id)}
                    className="group cursor-pointer flex flex-col space-y-2 sm:space-y-3 bg-[#151311] p-2.5 sm:p-3 rounded-xs border border-[#26221e] hover:border-[#8c562e] transition-colors duration-300 shadow-md"
                  >
                    <div className="relative aspect-4/5 w-full bg-[#1e1a17] overflow-hidden">
                      {prod.badge && (
                        <span className={`absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10 px-1.5 sm:px-2 py-0.5 text-white text-[8px] sm:text-[9px] font-bold tracking-widest uppercase shadow-xs ${
                          prod.badge === 'NEW' ? 'bg-[#d4af37] text-[#0c0a09]' : 'bg-[#8c562e]'
                        }`}>
                          {prod.badge}
                        </span>
                      )}
                      <img
                        src={prod.images?.[0] || 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80'}
                        alt={`${prod.name} - Handcrafted full-grain ${prod.category || 'leather'} in ${prod.colorName || 'Artisan Patina'}`}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 ease-out"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start pt-1 gap-1 sm:gap-2">
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-semibold text-[#faf8f5] group-hover:text-[#d4af37] transition-colors line-clamp-1 sm:line-clamp-none">
                          {prod.name}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-[#8e877e] truncate">{prod.colorName || prod.material || 'Artisan Leather'}</p>
                      </div>
                      <div className="text-left sm:text-right whitespace-nowrap">
                        {Boolean(prod.originalPrice && prod.originalPrice > prod.price) && (
                          <span className="text-[10px] sm:text-xs text-[#a89f91] line-through block leading-none mb-0.5">
                            {formatINR(prod.originalPrice!)}
                          </span>
                        )}
                        <span className="font-serif-luxury text-xs sm:text-base font-bold text-[#faf8f5]">{formatINR(prod.price)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-14 px-6 text-center border border-dashed border-[#26221e] rounded-xs bg-[#151311]/50">
                  <Sparkles className="w-6 h-6 text-[#d4af37] mx-auto mb-3 opacity-80" />
                  <h4 className="font-serif-luxury text-lg text-[#faf8f5] font-semibold mb-1">
                    No Pieces Currently Cataloged
                  </h4>
                  <p className="text-xs text-[#8e877e] max-w-md mx-auto">
                    The permanent collection is awaiting new creations. New pieces added by the admin will automatically appear here.
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          {/* New Additions Subsection with Scroll Animation */}
          <div className="pt-16 border-t border-[#1f1c19]">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10"
            >
              <div>
                <h3 className="font-serif-luxury text-2xl sm:text-3xl font-bold tracking-tight text-[#faf8f5]">
                  New Additions
                </h3>
                <p className="text-sm text-[#a8a199] mt-1">
                  The latest additions to our permanent collection. Handcrafted with precision and patience.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCategoryFilter('Accessories');
                  setCurrentScreen('shop');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group relative inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#d4af37] hover:text-white transition-colors cursor-pointer py-1"
              >
                <span>View All New</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#d4af37] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </button>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8"
            >
              {newAdditionProducts.length > 0 ? (
                newAdditionProducts.map((prod, idx) => (
                  <motion.div
                    key={prod.id || prod.slug || `new-prod-${idx}`}
                    variants={cardVariants}
                    whileHover={{ y: -6, transition: { duration: 0.3 } }}
                    onClick={() => openProductBySlug(prod.slug || prod.id)}
                    className="group cursor-pointer flex flex-col space-y-2 sm:space-y-3 bg-[#151311] p-2.5 sm:p-3 rounded-xs border border-[#26221e] hover:border-[#8c562e] transition-colors duration-300 shadow-md"
                  >
                    <div className="relative aspect-4/5 w-full bg-[#1e1a17] overflow-hidden">
                      <span className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10 px-1.5 sm:px-2 py-0.5 bg-[#d4af37] text-[#0c0a09] text-[8px] sm:text-[9px] font-bold tracking-widest uppercase shadow-xs">
                        {prod.badge || 'NEW'}
                      </span>
                      <img
                        src={prod.images?.[0] || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80'}
                        alt={`${prod.name} - Handcrafted atelier piece in ${prod.colorName || 'Artisan Patina'}`}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 ease-out"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start pt-1 gap-1 sm:gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-[#faf8f5] group-hover:text-[#d4af37] transition-colors line-clamp-1 sm:line-clamp-none">
                          {prod.name}
                        </h4>
                        <p className="text-[10px] sm:text-xs text-[#8e877e] truncate">{prod.colorName || prod.material || 'Artisan Leather'}</p>
                      </div>
                      <div className="text-left sm:text-right whitespace-nowrap">
                        {Boolean(prod.originalPrice && prod.originalPrice > prod.price) && (
                          <span className="text-[10px] sm:text-xs text-[#a89f91] line-through block leading-none mb-0.5">
                            {formatINR(prod.originalPrice!)}
                          </span>
                        )}
                        <span className="font-serif-luxury text-xs sm:text-base font-bold text-[#faf8f5]">{formatINR(prod.price)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-14 px-6 text-center border border-dashed border-[#26221e] rounded-xs bg-[#151311]/50">
                  <Feather className="w-6 h-6 text-[#d4af37] mx-auto mb-3 opacity-80" />
                  <h4 className="font-serif-luxury text-lg text-[#faf8f5] font-semibold mb-1">
                    Awaiting New Additions
                  </h4>
                  <p className="text-xs text-[#8e877e] max-w-md mx-auto">
                    Newly cataloged artisan pieces and season additions will appear here.
                  </p>
                </div>
              )}
            </motion.div>
          </div>

        </div>
      </section>

      {/* 3. "DESIGNED TO AGE BEAUTIFULLY" EDITORIAL SPLIT SECTION (SCROLL TRIGGERED) */}
      <section id="story-materials-section" className="bg-[#f6f2ea] text-[#1c1917] py-24 px-4 sm:px-6 lg:px-8 border-y border-[#e6ded2]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Macro Patina Image with Smooth Reveal */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.85, ease: [0.25, 1, 0.5, 1] }}
            className="lg:col-span-6"
          >
            <div className="group relative aspect-4/3 w-full overflow-hidden shadow-xl rounded-xs border border-[#ded5c7]">
              <img
                src={tacticalWalletMaterialsImg}
                alt="Technical Ripstop Wallet Material and Construction Detail"
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-xs text-[#faf8f5] text-[10px] uppercase tracking-widest px-3 py-1.5 font-medium shadow-sm">
                Day 1 vs. Year 5 Patina
              </div>
            </div>
          </motion.div>

          {/* Right Column: Copy & Action */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.85, delay: 0.15, ease: [0.25, 1, 0.5, 1] }}
            className="lg:col-span-6 space-y-6"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-[#8c562e] inline-block">
              Material Philosophy
            </span>
            <h2 className="font-serif-luxury text-3xl sm:text-4xl font-bold tracking-tight text-[#1c1917] leading-snug">
              Designed to Age Beautifully
            </h2>
            <p className="text-base text-[#4a443e] leading-relaxed">
              Our vegetable-tanned leathers are selected for their ability to develop a unique patina over time, telling the story of your journeys.
            </p>
            <p className="text-sm text-[#736c64] leading-relaxed">
              Unlike mass-manufactured bonded leather coated in synthetic plastics, authentic full-grain vegetable-tanned hides breathe, absorb ambient oils, and deepen in luster with every touch.
            </p>

            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                id="learn-materials-btn"
                onClick={() => {
                  setSelectedCategoryFilter('All');
                  setCurrentScreen('shop');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-8 py-3.5 bg-[#1c1917] hover:bg-[#8c562e] text-[#faf8f5] text-xs font-semibold uppercase tracking-[0.2em] transition-colors shadow-sm cursor-pointer"
              >
                Learn About Our Materials
              </motion.button>
            </div>
          </motion.div>

        </div>
      </section>

      {/* 4. "AT THE ATELIER" WORKSHOP PROCESS (SCROLL STAGGERED) */}
      <section className="bg-[#0c0a09] text-[#f7f4ee] py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-16">
          
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="text-center space-y-3 max-w-xl mx-auto"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">
              Craftsmanship
            </span>
            <h2 className="font-serif-luxury text-3xl sm:text-4xl font-bold text-[#faf8f5]">
              At The Atelier
            </h2>
            <p className="text-sm text-[#a8a199]">
              A glimpse into the slow, intentional process behind every piece.
            </p>
          </motion.div>

          {/* 3 Photos with captions & staggered entrance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Step 1: Saddle Stitching */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.75, delay: 0.1, ease: 'easeOut' }}
              whileHover={{ y: -6 }}
              className="space-y-4 group cursor-default"
            >
              <div className="relative aspect-4/5 sm:aspect-3/4 w-full overflow-hidden bg-[#141210] border border-[#26221e] rounded-xs">
                <img
                  src={artisanSaddleStitchImg}
                  alt="Master artisan hand saddle stitching leather at Stunning Birds Atelier"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#d4af37]">Step 01</span>
                  <h3 className="font-serif-luxury text-lg font-bold">Traditional Saddle Stitch</h3>
                </div>
              </div>
              <p className="text-xs text-[#a8a199] leading-relaxed">
                Hand-sewn with two needles and waxed French linen thread. Unlike machine lock-stitches, a saddle stitch will never unravel even if a strand breaks.
              </p>
            </motion.div>

            {/* Step 2: Hand Skiving & Beveling */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.75, delay: 0.25, ease: 'easeOut' }}
              whileHover={{ y: -6 }}
              className="space-y-4 group cursor-default"
            >
              <div className="relative aspect-4/5 sm:aspect-3/4 w-full overflow-hidden bg-[#141210] border border-[#26221e] rounded-xs">
                <img
                  src={beveledLeatherWalletImg}
                  alt="Handcrafted leather wallet with hand beveled edges on walnut wood"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#d4af37]">Step 02</span>
                  <h3 className="font-serif-luxury text-lg font-bold">Hand Beveled Edges</h3>
                </div>
              </div>
              <p className="text-xs text-[#a8a199] leading-relaxed">
                Carefully shaved and rounded using Japanese edge skivers to remove sharp corners and create comfortable pocket ergonomics.
              </p>
            </motion.div>

            {/* Step 3: Beeswax Burnishing */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.75, delay: 0.4, ease: 'easeOut' }}
              whileHover={{ y: -6 }}
              className="space-y-4 group cursor-default"
            >
              <div className="relative aspect-4/5 sm:aspect-3/4 w-full overflow-hidden bg-[#141210] border border-[#26221e] rounded-xs">
                <img
                  src={darkVelvetWalletImg}
                  alt="Luxury dark velvet textured wallet with organic beeswax burnished edges"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#d4af37]">Step 03</span>
                  <h3 className="font-serif-luxury text-lg font-bold">Organic Beeswax Burnish</h3>
                </div>
              </div>
              <p className="text-xs text-[#a8a199] leading-relaxed">
                Friction-rubbed with dense hardwood burnishers and organic beeswax to permanently seal the fibers against moisture and friction.
              </p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 5. "OBJECTS WORTH KEEPING" NEWSLETTER SECTION */}
      <section className="bg-[#fbf8f4] text-[#1c1917] py-24 px-4 sm:px-6 lg:px-8 border-t border-[#ece4d8]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-xl mx-auto text-center space-y-6"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-[#8c562e]">
            The Society
          </span>
          <h2 className="font-serif-luxury text-3xl sm:text-4xl font-bold tracking-tight text-[#1c1917]">
            Objects Worth Keeping
          </h2>
          <p className="text-sm text-[#615951] leading-relaxed">
            Join our journal for new collections, craftsmanship stories, and private offers.
          </p>

          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2.5 pt-2 max-w-md mx-auto">
            <input
              id="newsletter-email-input"
              type="email"
              required
              value={newsletterEmail}
              onChange={e => setNewsletterEmail(e.target.value)}
              placeholder="Email Address"
              className="flex-1 bg-white border border-[#ded5c7] px-4 py-3 text-xs text-[#1c1917] placeholder-[#8c857d] focus:outline-none focus:border-[#8c562e] transition-colors rounded-none"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id="newsletter-submit-btn"
              type="submit"
              className="px-8 py-3 bg-[#1c1917] hover:bg-[#8c562e] text-white text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors cursor-pointer whitespace-nowrap shadow-sm"
            >
              {subscribed ? 'Subscribed' : 'Subscribe'}
            </motion.button>
          </form>
          {subscribed && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#15803d] font-medium flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Thank you for subscribing to our journal.</span>
            </motion.p>
          )}
        </motion.div>
      </section>

    </div>
  );
};

