import { Product } from '../types';

export const CANONICAL_DOMAIN = 'https://stunningbirds.in';

/**
 * Returns the canonical base URL for the production site:
 * https://stunningbirds.in
 */
export const getProductionBaseUrl = (): string => {
  return CANONICAL_DOMAIN;
};

/**
 * Generates a clean, stable canonical HTTPS URL for a specific product.
 */
export const getProductCanonicalUrl = (product: { slug?: string; id: string }): string => {
  const identifier = product.slug || product.id;
  return `${CANONICAL_DOMAIN}/products/${encodeURIComponent(identifier)}`;
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
export const setJsonLdScript = (id: string, data: Record<string, any>) => {
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
export const removeJsonLdScript = (id: string) => {
  if (typeof document === 'undefined') return;
  const script = document.getElementById(id);
  if (script && script.parentNode) {
    script.parentNode.removeChild(script);
  }
};

/**
 * Computes the effective SEO Title and Meta Description for a product,
 * returning either the bespoke saved values or the dynamically generated fallback.
 */
export const getEffectiveProductSEO = (product: Product): {
  seoTitle: string;
  seoMetaDescription: string;
  isCustomTitle: boolean;
  isCustomDescription: boolean;
} => {
  const customSeoTitle = (product.seoTitle || product.seo_title)?.trim();
  const customSeoDescription = (product.seoMetaDescription || product.seo_meta_description)?.trim();

  const rawDesc = (product.description || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const categoryName = product.category || 'Leather Goods';
  const colorPart = product.colorName ? ` in ${product.colorName}` : '';
  const fallbackTitle = `${product.name}${colorPart} | Luxury Handcrafted ${categoryName} | STUNNING BIRDS`;

  let fallbackDesc = '';
  if (rawDesc.length >= 60) {
    fallbackDesc = rawDesc.length > 155 ? `${rawDesc.slice(0, 152)}...` : rawDesc;
  } else if (rawDesc.length > 0) {
    const extra = product.material ? ` Crafted from ${product.material}.` : '';
    fallbackDesc = `${product.name}.${extra} ${rawDesc} Complimentary express courier across India.`;
  } else {
    fallbackDesc = `Shop the ${product.name}${colorPart} by STUNNING BIRDS. Premium full-grain handcrafted ${categoryName.toLowerCase()} with bespoke personalization.`;
  }

  return {
    seoTitle: customSeoTitle || fallbackTitle,
    seoMetaDescription: customSeoDescription || fallbackDesc,
    isCustomTitle: Boolean(customSeoTitle),
    isCustomDescription: Boolean(customSeoDescription),
  };
};

/**
 * Builds valid Schema.org Product structured data (JSON-LD) using actual existing product details.
 */
export const buildProductJsonLd = (product: Product, canonicalUrl: string): Record<string, any> => {
  const sellingPrice = product.sellingPrice || product.price || 0;
  const rawDesc = (product.description || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const images: string[] = [];
  if (Array.isArray(product.images) && product.images.length > 0) {
    product.images.forEach(img => {
      if (typeof img === 'string' && img.trim()) {
        images.push(img.trim());
      }
    });
  }
  if (images.length === 0) {
    images.push('https://arbfxnozydyodjkkgdoa.supabase.co/storage/v1/object/public/Assets/web-app-manifest-512x512.png');
  }

  const sku = product.sku || product.skuId;
  const inStock = product.inStock !== false && (product.stockQuantity === undefined || product.stockQuantity > 0);

  const jsonLdData: Record<string, any> = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    'name': product.name,
    'description': rawDesc || `${product.name} handcrafted by STUNNING BIRDS.`,
    'image': images,
    'brand': {
      '@type': 'Brand',
      'name': 'STUNNING BIRDS'
    },
    'offers': {
      '@type': 'Offer',
      'url': canonicalUrl,
      'priceCurrency': 'INR',
      'price': String(sellingPrice),
      'itemCondition': 'https://schema.org/NewCondition',
      'availability': inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'seller': {
        '@type': 'Organization',
        'name': 'STUNNING BIRDS'
      }
    }
  };

  if (sku) {
    jsonLdData['sku'] = sku;
    jsonLdData['mpn'] = sku;
  }

  if (product.category) {
    jsonLdData['category'] = product.category;
  }

  if (product.colorName) {
    jsonLdData['color'] = product.colorName;
  }

  if (product.material) {
    jsonLdData['material'] = product.material;
  }

  // AggregateRating from reviews if present
  const hasReviewsCount = Boolean(product.reviewsCount && product.reviewsCount > 0);
  const hasReviewsArray = Boolean(product.reviews && product.reviews.length > 0);
  if (product.rating && (hasReviewsCount || hasReviewsArray)) {
    const revCount = product.reviews?.length || product.reviewsCount || 1;
    jsonLdData['aggregateRating'] = {
      '@type': 'AggregateRating',
      'ratingValue': Number(product.rating).toFixed(1),
      'reviewCount': String(revCount),
      'bestRating': '5',
      'worstRating': '1'
    };
  }

  if (Array.isArray(product.reviews) && product.reviews.length > 0) {
    jsonLdData['review'] = product.reviews.slice(0, 5).map(r => ({
      '@type': 'Review',
      'author': {
        '@type': 'Person',
        'name': r.authorName || 'Verified Buyer'
      },
      'datePublished': r.date || new Date().toISOString().split('T')[0],
      'reviewRating': {
        '@type': 'Rating',
        'ratingValue': String(r.rating || 5),
        'bestRating': '5'
      },
      'reviewBody': r.comment || r.title || 'Exceptional craftsmanship and leather quality.'
    }));
  }

  return jsonLdData;
};

/**
 * Applies dynamic SEO metadata for a single public product page.
 * Updates <title>, <meta name="description">, <link rel="canonical">,
 * og:title, og:description, og:url, og:image, twitter:title, twitter:description,
 * twitter:url, twitter:image, and Schema.org Product structured data.
 */
export const applyProductSEO = (product: Product) => {
  if (typeof document === 'undefined' || !product) return;

  const canonicalUrl = getProductCanonicalUrl(product);
  const primaryImage = product.images && product.images.length > 0
    ? product.images[0]
    : 'https://arbfxnozydyodjkkgdoa.supabase.co/storage/v1/object/public/Assets/web-app-manifest-512x512.png';

  const sellingPrice = product.sellingPrice || product.price || 0;

  // Compute effective dynamic SEO title & meta description
  const { seoTitle: effectiveTitle, seoMetaDescription: effectiveDescription } = getEffectiveProductSEO(product);

  // 1. Dynamic Page Title
  document.title = effectiveTitle;

  // 2. Dynamic Meta Description
  setMetaTag('name', 'description', effectiveDescription);
  setMetaTag('name', 'keywords', `${product.name}, ${product.category || 'leather goods'}, luxury leather wallet, handcrafted wallet, vegetable tanned leather, bespoke monogram, ${product.colorName || 'leather'}`);
  setMetaTag('name', 'author', 'STUNNING BIRDS Atelier');

  // 3. Canonical URL
  setCanonicalLink(canonicalUrl);

  // 4. OpenGraph Metadata
  setMetaTag('property', 'og:title', effectiveTitle);
  setMetaTag('property', 'og:description', effectiveDescription);
  setMetaTag('property', 'og:url', canonicalUrl);
  setMetaTag('property', 'og:image', primaryImage);
  setMetaTag('property', 'og:image:alt', `${product.name} in ${product.colorName || 'handcrafted finish'}`);
  setMetaTag('property', 'og:type', 'product');
  setMetaTag('property', 'og:site_name', 'STUNNING BIRDS');
  setMetaTag('property', 'product:price:amount', String(sellingPrice));
  setMetaTag('property', 'product:price:currency', 'INR');
  setMetaTag('property', 'product:availability', product.inStock !== false ? 'in stock' : 'out of stock');
  setMetaTag('property', 'product:brand', 'STUNNING BIRDS');
  if (product.category) {
    setMetaTag('property', 'product:category', product.category);
  }

  // 5. Twitter / X Card Metadata
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', effectiveTitle);
  setMetaTag('name', 'twitter:description', effectiveDescription);
  setMetaTag('name', 'twitter:url', canonicalUrl);
  setMetaTag('name', 'twitter:image', primaryImage);
  setMetaTag('name', 'twitter:image:alt', `${product.name} - Handcrafted luxury leather`);

  // 6. Schema.org Product Structured Data (JSON-LD)
  const jsonLdData = buildProductJsonLd(product, canonicalUrl);
  setJsonLdScript('product-schema-ldjson', jsonLdData);
};

/**
 * Resets the SEO metadata back to default brand parameters for non-product screens.
 */
export const resetDefaultSEO = (screenName = 'home', categoryFilter?: string) => {
  if (typeof document === 'undefined') return;

  const baseUrl = CANONICAL_DOMAIN;
  let title = 'STUNNING BIRDS | Luxury Leather Goods & Accessories';
  let description = 'Explore STUNNING BIRDS, a leather atelier offering premium bags, wallets, and accessories crafted with timeless style and exceptional attention to detail.';
  let canonical = `${baseUrl}/`;

  if (screenName === 'shop') {
    if (categoryFilter && categoryFilter !== 'All') {
      title = `${categoryFilter} Collection | STUNNING BIRDS`;
      description = `Explore our bespoke ${categoryFilter.toLowerCase()} collection. Handcrafted luxury leather goods crafted with timeless style and exceptional attention to detail.`;
      canonical = `${baseUrl}/shop`;
    } else {
      title = 'Handcrafted Leather Wallets & Goods Collection | STUNNING BIRDS';
      description = 'Discover the complete STUNNING BIRDS collection of luxury bifold wallets, cardholders, and bespoke leather goods.';
      canonical = `${baseUrl}/shop`;
    }
  } else if (screenName === 'account') {
    title = 'Patron Sanctuary — Account & Commission History | STUNNING BIRDS';
    description = 'Manage your bespoke commissions, saved delivery residences, and society rewards at STUNNING BIRDS Atelier.';
    canonical = `${baseUrl}/account`;
  } else if (screenName === 'checkout') {
    title = 'Secure Atelier Checkout | STUNNING BIRDS';
    description = 'Complete your bespoke leather commission with encrypted checkout, UPI, cards, and complimentary insured courier.';
    canonical = `${baseUrl}/checkout`;
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
    canonical = `${baseUrl}/admin-overview`;
  }

  document.title = title;
  setMetaTag('name', 'description', description);
  setCanonicalLink(canonical);

  // OpenGraph defaults
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:image', 'https://arbfxnozydyodjkkgdoa.supabase.co/storage/v1/object/public/Assets/web-app-manifest-512x512.png');
  setMetaTag('property', 'og:url', canonical);
  setMetaTag('property', 'og:type', 'website');
  setMetaTag('property', 'og:site_name', 'STUNNING BIRDS');

  // Twitter defaults
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:url', canonical);
  setMetaTag('name', 'twitter:image', 'https://arbfxnozydyodjkkgdoa.supabase.co/storage/v1/object/public/Assets/web-app-manifest-512x512.png');

  // Remove product JSON-LD script if left over
  removeJsonLdScript('product-schema-ldjson');
};
