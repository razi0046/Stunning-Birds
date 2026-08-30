import { Product } from '../types';

/**
 * Returns the canonical base URL for the production site,
 * falling back gracefully in development or preview mode.
 */
export const getProductionBaseUrl = (): string => {
  // If explicitly configured via environment variable
  const envUrl = (import.meta as any).env?.VITE_SITE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // If running in browser environment
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    // For localhost or sandbox containers, use production domain for canonical SEO or current origin
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'https://stunningbirds.com';
    }
    return origin.replace(/\/+$/, '');
  }

  return 'https://stunningbirds.com';
};

/**
 * Generates a clean, stable canonical URL for a specific product.
 */
export const getProductCanonicalUrl = (product: { slug?: string; id: string }): string => {
  const identifier = product.slug || product.id;
  return `${getProductionBaseUrl()}/products/${encodeURIComponent(identifier)}`;
};

/**
 * Utility to set or update a meta tag in document head.
 */
const setMetaTag = (attributeName: 'name' | 'property', attributeValue: string, content: string) => {
  if (typeof document === 'undefined') return;

  let element = document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

/**
 * Utility to set or update canonical link tag in document head.
 */
const setCanonicalLink = (href: string) => {
  if (typeof document === 'undefined') return;

  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
};

/**
 * Utility to inject or update JSON-LD structured script.
 */
const setJsonLdScript = (id: string, data: Record<string, any>) => {
  if (typeof document === 'undefined') return;

  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data, null, 2);
};

/**
 * Utility to remove JSON-LD structured script by ID.
 */
const removeJsonLdScript = (id: string) => {
  if (typeof document === 'undefined') return;
  const script = document.getElementById(id);
  if (script && script.parentNode) {
    script.parentNode.removeChild(script);
  }
};

/**
 * Applies dynamic SEO metadata for a single product page.
 * Uses real product fields from Supabase (title, description, price, category, images, reviews).
 */
export const applyProductSEO = (product: Product) => {
  if (typeof document === 'undefined' || !product) return;

  const canonicalUrl = getProductCanonicalUrl(product);
  const primaryImage = product.images && product.images.length > 0
    ? product.images[0]
    : 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1200&q=85';

  const sellingPrice = product.sellingPrice || product.price || 0;
  const rawDesc = (product.description || '').replace(/\s+/g, ' ').trim();
  const materialInfo = product.material ? `Handcrafted in ${product.material}.` : 'Handcrafted full-grain leather.';
  const colorInfo = product.colorName ? `Available in ${product.colorName}.` : '';
  
  // Clean meta description with optimal length (140 - 160 characters)
  const metaDescription = rawDesc.length >= 60
    ? `${product.name}: ${rawDesc.slice(0, 140)}... Bespoke personalization & complimentary shipping.`
    : `Discover ${product.name} — ${materialInfo} ${colorInfo} Bespoke monogramming & complimentary express courier nationwide.`;

  // 1. Dynamic Page Title
  document.title = `${product.name} — Luxury Handcrafted ${product.category || 'Leather Goods'} | STUNNING BIRDS`;

  // 2. Dynamic Meta Description & Keywords
  setMetaTag('name', 'description', metaDescription);
  setMetaTag('name', 'keywords', `${product.name}, ${product.category}, luxury leather wallet, handcrafted wallet, vegetable tanned leather, bespoke monogram, ${product.colorName || 'leather'}`);
  setMetaTag('name', 'author', 'STUNNING BIRDS Atelier');

  // 3. Canonical URL
  setCanonicalLink(canonicalUrl);

  // 4. OpenGraph Metadata (Facebook, WhatsApp, LinkedIn, iMessage)
  setMetaTag('property', 'og:title', `${product.name} — STUNNING BIRDS Atelier`);
  setMetaTag('property', 'og:description', metaDescription);
  setMetaTag('property', 'og:image', primaryImage);
  setMetaTag('property', 'og:image:alt', `${product.name} in ${product.colorName || 'handcrafted finish'}`);
  setMetaTag('property', 'og:url', canonicalUrl);
  setMetaTag('property', 'og:type', 'product');
  setMetaTag('property', 'og:site_name', 'STUNNING BIRDS');
  setMetaTag('property', 'product:price:amount', String(sellingPrice));
  setMetaTag('property', 'product:price:currency', 'INR');
  setMetaTag('property', 'product:availability', product.inStock !== false ? 'in stock' : 'out of stock');
  setMetaTag('property', 'product:brand', 'STUNNING BIRDS');
  setMetaTag('property', 'product:category', product.category || 'Leather Wallets');
  setMetaTag('property', 'product:condition', 'new');

  // 5. Twitter / X Card Metadata
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', `${product.name} — STUNNING BIRDS`);
  setMetaTag('name', 'twitter:description', metaDescription);
  setMetaTag('name', 'twitter:image', primaryImage);
  setMetaTag('name', 'twitter:image:alt', `${product.name} - Handcrafted luxury leather`);
  setMetaTag('name', 'twitter:site', '@stunningbirds');

  // 6. Schema.org Structured Data (JSON-LD)
  const reviewsCount = product.reviews?.length || product.reviewsCount || 1;
  const ratingValue = (product.rating || 5.0).toFixed(1);

  const jsonLdData: Record<string, any> = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    'name': product.name,
    'image': product.images && product.images.length > 0 ? product.images : [primaryImage],
    'description': rawDesc || `Handcrafted ${product.category} crafted from ${product.material || 'fine leather'}.`,
    'sku': product.sku || product.skuId || `SB-${product.id}`,
    'mpn': product.sku || product.skuId || `SB-${product.id}`,
    'category': product.category || 'Leather Goods',
    'color': product.colorName,
    'material': product.material,
    'brand': {
      '@type': 'Brand',
      'name': 'STUNNING BIRDS'
    },
    'offers': {
      '@type': 'Offer',
      'url': canonicalUrl,
      'priceCurrency': 'INR',
      'price': String(sellingPrice),
      'priceValidUntil': '2027-12-31',
      'itemCondition': 'https://schema.org/NewCondition',
      'availability': product.inStock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'seller': {
        '@type': 'Organization',
        'name': 'STUNNING BIRDS'
      }
    },
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': ratingValue,
      'reviewCount': String(reviewsCount),
      'bestRating': '5',
      'worstRating': '1'
    }
  };

  if (product.reviews && product.reviews.length > 0) {
    jsonLdData['review'] = product.reviews.slice(0, 5).map(r => ({
      '@type': 'Review',
      'author': {
        '@type': 'Person',
        'name': r.authorName || 'Patron'
      },
      'datePublished': r.date || new Date().toISOString().split('T')[0],
      'reviewRating': {
        '@type': 'Rating',
        'ratingValue': String(r.rating || 5),
        'bestRating': '5'
      },
      'reviewBody': r.comment || r.title || 'Exceptional leather quality and craftsmanship.'
    }));
  }

  setJsonLdScript('product-schema-ldjson', jsonLdData);
};

/**
 * Resets the SEO metadata back to default brand parameters for non-product screens.
 */
export const resetDefaultSEO = (screenName = 'home', categoryFilter?: string) => {
  if (typeof document === 'undefined') return;

  const baseUrl = getProductionBaseUrl();
  let title = 'STUNNING BIRDS — Modern Luxury Leather Goods';
  let description = 'Handcrafted full-grain leather goods, designed for quiet moments and long journeys. Bespoke monogramming & complimentary nationwide express courier.';
  let canonical = `${baseUrl}/`;

  if (screenName === 'shop') {
    if (categoryFilter && categoryFilter !== 'All') {
      title = `${categoryFilter} Collection — Luxury Handcrafted Leather | STUNNING BIRDS`;
      description = `Explore our bespoke ${categoryFilter.toLowerCase()} collection. Crafted from full-grain Tuscan leather with custom gold debossing.`;
      canonical = `${baseUrl}/#/shop?category=${encodeURIComponent(categoryFilter)}`;
    } else {
      title = 'Handcrafted Leather Wallets & Goods Collection | STUNNING BIRDS';
      description = 'Discover the complete STUNNING BIRDS collection of luxury bifold wallets, cardholders, travel organizers, and bespoke leather goods.';
      canonical = `${baseUrl}/#/shop`;
    }
  } else if (screenName === 'account') {
    title = 'Patron Sanctuary — Account & Commission History | STUNNING BIRDS';
    description = 'Manage your bespoke commissions, saved delivery residences, and society rewards at STUNNING BIRDS Atelier.';
    canonical = `${baseUrl}/#/account`;
  } else if (screenName === 'checkout') {
    title = 'Secure Atelier Checkout | STUNNING BIRDS';
    description = 'Complete your bespoke leather commission with encrypted checkout, UPI, cards, and complimentary insured courier.';
    canonical = `${baseUrl}/#/checkout`;
  } else if (screenName === 'terms-and-conditions') {
    title = 'Terms & Conditions | STUNNING BIRDS';
    description = 'Terms & Conditions governing the use of STUNNING BIRDS online boutique, product sales, orders, and payment terms.';
    canonical = `${baseUrl}/terms-and-conditions`;
  } else if (screenName === 'privacy-policy') {
    title = 'Privacy Policy | STUNNING BIRDS';
    description = 'Privacy Policy for STUNNING BIRDS — How we collect, safeguard, and handle customer data and payment privacy.';
    canonical = `${baseUrl}/privacy-policy`;
  } else if (screenName === 'shipping-policy') {
    title = 'Shipping Policy | STUNNING BIRDS';
    description = 'Shipping Policy for STUNNING BIRDS — Information on order processing, insured courier delivery times, and packaging.';
    canonical = `${baseUrl}/shipping-policy`;
  } else if (screenName === 'cancellation-and-refund') {
    title = 'Cancellation & Refund Policy | STUNNING BIRDS';
    description = 'Cancellation & Refund Policy for STUNNING BIRDS — Terms for order cancellations, replacements, returns, and refunds.';
    canonical = `${baseUrl}/cancellation-and-refund`;
  } else if (screenName === 'contact-us') {
    title = 'Contact Us | STUNNING BIRDS';
    description = 'Contact STUNNING BIRDS customer support for product advice, order tracking, payment support, and atelier inquiries.';
    canonical = `${baseUrl}/contact-us`;
  } else if (screenName === 'admin-overview' || screenName === 'admin-orders' || screenName === 'admin-login') {
    title = 'Commerce Manager & Atelier Dashboard | STUNNING BIRDS';
    description = 'Administrative portal for STUNNING BIRDS atelier operations, order fulfillment, and product catalog management.';
    canonical = `${baseUrl}/#/admin`;
  }

  document.title = title;
  setMetaTag('name', 'description', description);
  setCanonicalLink(canonical);

  // OpenGraph defaults
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:image', 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1200&q=85');
  setMetaTag('property', 'og:url', canonical);
  setMetaTag('property', 'og:type', 'website');
  setMetaTag('property', 'og:site_name', 'STUNNING BIRDS');

  // Twitter defaults
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1200&q=85');
  setMetaTag('name', 'twitter:site', '@stunningbirds');

  // Remove product JSON-LD script if left over
  removeJsonLdScript('product-schema-ldjson');
};
