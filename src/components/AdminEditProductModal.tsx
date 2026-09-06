import React, { useState } from 'react';
import { X, Save, Sparkles, Trash2, Plus, RefreshCw, Palette, Link2, Unlink, Globe } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { Product, ProductCategory, ProductHighlight } from '../types';
import { ImageGalleryUploader } from './ImageGalleryUploader';

interface Props {
  product: Product;
  onClose: () => void;
}

export const AdminEditProductModal: React.FC<Props> = ({ product, onClose }) => {
  const { updateProduct, deleteProduct, products } = useShop();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku || product.skuId || '');
  const [skuError, setSkuError] = useState<string | null>(null);
  const [price, setPrice] = useState(String(product.sellingPrice ?? product.price));
  const initialMrp = product.mrp ?? product.originalPrice ?? product.original_price;
  const [mrp, setMrp] = useState(initialMrp ? String(initialMrp) : '');
  const [category, setCategory] = useState<ProductCategory>(product.category);
  const [colorName, setColorName] = useState(product.colorName);
  const [colorHex, setColorHex] = useState(product.colorHex || '#3a2012');
  const [material, setMaterial] = useState(product.material);
  const [description, setDescription] = useState(product.description);
  const [seoTitle, setSeoTitle] = useState(product.seoTitle || product.seo_title || '');
  const [seoMetaDescription, setSeoMetaDescription] = useState(product.seoMetaDescription || product.seo_meta_description || '');
  const [images, setImages] = useState<string[]>(product.images && product.images.length > 0 ? product.images : [
    'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1200&q=85'
  ]);
  const [badge, setBadge] = useState(product.badge || '');
  const [inStock, setInStock] = useState(product.inStock);
  const [stockQuantity, setStockQuantity] = useState(String(product.stockQuantity ?? 50));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Colour Variant Linking State
  const [variantGroup, setVariantGroup] = useState<string>(product.variantGroup || '');
  const [linkedVariantIds, setLinkedVariantIds] = useState<string[]>(() => {
    if (product.linkedVariantIds && product.linkedVariantIds.length > 0) {
      return product.linkedVariantIds;
    }
    const implicitlyLinked = products
      .filter(p => p.id !== product.id && (
        p.linkedVariantIds?.includes(product.id) ||
        (product.variantGroup && p.variantGroup && p.variantGroup.toLowerCase() === product.variantGroup.toLowerCase())
      ))
      .map(p => p.id);
    return Array.from(new Set(implicitlyLinked));
  });

  // Dynamic Product Highlights Key-Value state
  const [highlights, setHighlights] = useState<ProductHighlight[]>(() => {
    if (product.productHighlights && product.productHighlights.length > 0) {
      return product.productHighlights.map(h => ({ ...h }));
    }
    return [
      { label: 'Leather Grade', value: product.material || 'Full-Grain Leather' },
      { label: 'Colorway', value: product.colorName || 'Espresso' },
      { label: 'Dimensions', value: product.dimensions || '4.2" x 3.2"' },
      { label: 'Crafting Origin', value: 'Hand-burnished at the Tuscany Atelier, Italy' },
    ];
  });

  const handleAddHighlight = () => {
    setHighlights([...highlights, { label: '', value: '' }]);
  };

  const handleUpdateHighlight = (index: number, field: 'label' | 'value', text: string) => {
    const updated = [...highlights];
    updated[index][field] = text;
    setHighlights(updated);
  };

  const handleRemoveHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  const handleSkuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/\s+/g, '-');
    setSku(val);
    if (!val.trim()) {
      setSkuError('SKU ID is required');
    } else {
      const isDuplicate = products.some(p => p.id !== product.id && ((p.sku && p.sku.toUpperCase() === val) || (p.skuId && p.skuId.toUpperCase() === val)));
      if (isDuplicate) {
        setSkuError('Warning: This SKU ID is used by another product');
      } else {
        setSkuError(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSku = sku.trim();
    if (!cleanSku) {
      setSkuError('SKU ID is required');
      return;
    }
    if (!name.trim()) return;

    if (images.length === 0) {
      alert('Please upload or keep at least 1 JPG image (3–4 recommended).');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const validHighlights = highlights.filter(h => h.label.trim() && h.value.trim());
      const parsedPrice = parseFloat(price) || product.price;
      const parsedMrp = mrp.trim() ? parseFloat(mrp) : null;

      await updateProduct(product.id, {
        name: name.trim(),
        sku: cleanSku,
        skuId: cleanSku,
        price: parsedPrice,
        sellingPrice: parsedPrice,
        selling_price: parsedPrice,
        originalPrice: parsedMrp !== null ? parsedMrp : undefined,
        mrp: parsedMrp !== null ? parsedMrp : undefined,
        original_price: parsedMrp !== null ? parsedMrp : undefined,
        category,
        colorName: colorName.trim(),
        colorHex,
        material: material.trim(),
        description: description.trim(),
        seoTitle: seoTitle.trim() || undefined,
        seo_title: seoTitle.trim() || undefined,
        seoMetaDescription: seoMetaDescription.trim() || undefined,
        seo_meta_description: seoMetaDescription.trim() || undefined,
        images: images.length > 0 ? images : product.images,
        badge: badge ? (badge as any) : undefined,
        inStock,
        stockQuantity: parseInt(stockQuantity, 10) || 0,
        productHighlights: validHighlights,
        variantGroup: variantGroup.trim(),
        linkedVariantIds,
      });

      onClose();
    } catch (err: any) {
      console.error('Failed to update product:', err);
      setFormError(err?.message || 'Failed to upload images and update piece.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const success = await deleteProduct(product.id);
      if (success) {
        onClose();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#fbf9f5] rounded-lg shadow-2xl border border-[#ded5c7] overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10">
        
        <div className="p-6 bg-[#f6f2ea] border-b border-[#e4dcd0] flex justify-between items-center">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[#8c562e] font-bold">Commerce Manager</span>
            <h3 className="font-serif-luxury text-xl font-bold text-[#181614]">
              Edit Atelier Piece
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#78716c] hover:text-black rounded-full cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {formError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 text-xs flex items-start gap-2">
              <span className="font-bold">Error:</span>
              <span className="flex-1">{formError}</span>
            </div>
          )}
          
          {/* Title & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block mb-1">
                Product Title *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. The Heritage Bifold Wallet"
                className="w-full bg-white border border-[#ded5c7] px-3.5 py-2.5 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block mb-1">
                SKU ID *
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={handleSkuChange}
                placeholder="e.g. WAL-BRN-001"
                className={`w-full bg-white border px-3.5 py-2.5 text-xs font-mono font-semibold tracking-wider uppercase text-[#181614] rounded-xs focus:outline-none ${
                  skuError && skuError.startsWith('Warning') 
                    ? 'border-[#f59e0b] focus:border-[#f59e0b]' 
                    : skuError 
                    ? 'border-[#ef4444] focus:border-[#ef4444]' 
                    : 'border-[#ded5c7] focus:border-[#8c562e]'
                }`}
              />
              {skuError ? (
                <p className={`text-[11px] mt-1 ${skuError.startsWith('Warning') ? 'text-[#d97706]' : 'text-[#dc2626]'}`}>
                  {skuError}
                </p>
              ) : (
                <p className="text-[11px] text-[#78716c] mt-1">
                  Unique inventory identifier (e.g. WAL-BRN-001).
                </p>
              )}
            </div>
          </div>

          {/* Pricing & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block mb-1">
                Selling Price (INR, ₹) *
              </label>
              <input
                type="number"
                required
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="9990"
                className="w-full bg-white border border-[#ded5c7] px-3.5 py-2.5 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
              />
              <span className="text-[10px] text-[#78716c] mt-0.5 block">Actual price charged to customer</span>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block mb-1">
                MRP / Original Price (INR, ₹)
              </label>
              <input
                type="number"
                value={mrp}
                onChange={e => setMrp(e.target.value)}
                placeholder="e.g. 14990 (Optional)"
                className="w-full bg-white border border-[#ded5c7] px-3.5 py-2.5 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
              />
              <span className="text-[10px] text-[#78716c] mt-0.5 block">Struck-through if &gt; selling price</span>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full bg-white border border-[#ded5c7] px-3.5 py-2.5 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
              >
                <option value="Bifold Wallets">Bifold Wallets</option>
                <option value="Cardholders">Cardholders</option>
                <option value="Travel Wallets">Travel Wallets</option>
                <option value="Bags & Totes">Bags & Totes</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block mb-1">
                Color Name
              </label>
              <input
                type="text"
                value={colorName}
                onChange={e => setColorName(e.target.value)}
                placeholder="e.g. Cognac Bridle"
                className="w-full bg-white border border-[#ded5c7] px-3.5 py-2.5 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block mb-1">
                Color Swatch (HEX)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorHex.startsWith('#') ? colorHex : '#3a2012'}
                  onChange={e => setColorHex(e.target.value)}
                  className="w-10 h-9 p-0.5 border border-[#ded5c7] rounded-xs cursor-pointer bg-white"
                />
                <input
                  type="text"
                  value={colorHex}
                  onChange={e => setColorHex(e.target.value)}
                  placeholder="#3a2012"
                  className="flex-1 bg-white border border-[#ded5c7] px-3 py-2 text-xs font-mono text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block mb-1">
                Badge
              </label>
              <select
                value={badge}
                onChange={e => setBadge(e.target.value)}
                className="w-full bg-white border border-[#ded5c7] px-3.5 py-2.5 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
              >
                <option value="">None</option>
                <option value="NEW">NEW</option>
                <option value="BEST SELLER">BEST SELLER</option>
                <option value="BESTSELLER">BESTSELLER</option>
                <option value="LIMITED">LIMITED</option>
                <option value="ARTISAN CHOICE">ARTISAN CHOICE</option>
              </select>
            </div>
          </div>

          {/* COLOUR VARIANTS & FAMILY LINKING */}
          <div className="p-4 bg-[#fcfbf9] border border-[#e8dfd2] rounded-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#8c562e]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#181614]">
                    Colour Variants & Family Linking
                  </h4>
                </div>
                <p className="text-[11px] text-[#78716c] mt-0.5">
                  Link this product with other colorways of the same product style. On the product page, customers can switch colours with dedicated photos, SKU, price, and stock for each colorway.
                </p>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#181614] block mb-1">
                Variant Group / Collection Name (Optional)
              </label>
              <input
                type="text"
                value={variantGroup}
                onChange={e => setVariantGroup(e.target.value)}
                placeholder="e.g. Heritage Bifold Series"
                className="w-full bg-white border border-[#ded5c7] px-3 py-2 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
              />
              <span className="text-[10px] text-[#78716c] mt-0.5 block">
                Helps group variants across the catalog
              </span>
            </div>

            {/* Currently Linked Variants */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#181614] block mb-1.5">
                Linked Colourways ({linkedVariantIds.length})
              </label>
              {linkedVariantIds.length === 0 ? (
                <p className="text-xs italic text-[#a8a29e] p-2.5 bg-white border border-dashed border-[#e4dcd0] rounded-xs text-center">
                  No other colorway variants linked yet. Select an existing product below to link as another colour option.
                </p>
              ) : (
                <div className="space-y-2">
                  {linkedVariantIds.map(vId => {
                    const linkedProd = products.find(p => p.id === vId || p.slug === vId);
                    if (!linkedProd) return null;
                    const inStockVariant = linkedProd.inStock !== false && (linkedProd.stockQuantity === undefined || linkedProd.stockQuantity > 0);

                    return (
                      <div
                        key={vId}
                        className="flex items-center justify-between p-2.5 bg-white border border-[#ded5c7] rounded-xs hover:border-[#8c562e] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-5 h-5 rounded-full shrink-0 border border-black/15 shadow-2xs"
                            style={{ backgroundColor: linkedProd.colorHex || '#3a2012' }}
                            title={linkedProd.colorName}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-[#181614] truncate">
                                {linkedProd.name}
                              </span>
                              <span className="text-[11px] font-medium text-[#8c562e]">
                                ({linkedProd.colorName})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-[#78716c]">
                              <span>SKU: {linkedProd.sku || linkedProd.skuId || 'N/A'}</span>
                              <span>•</span>
                              <span>₹{linkedProd.sellingPrice ?? linkedProd.price}</span>
                              <span>•</span>
                              <span className={inStockVariant ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                                {inStockVariant ? `In Stock (${linkedProd.stockQuantity ?? 50})` : 'Sold Out'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLinkedVariantIds(prev => prev.filter(id => id !== vId))}
                          className="p-1.5 text-[#9ca3af] hover:text-[#dc2626] rounded-xs transition-colors cursor-pointer shrink-0 ml-2"
                          title="Unlink variant"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selector to Link Other Catalog Products */}
            <div className="pt-2 border-t border-[#ede7de]">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#181614] block mb-1">
                Link Another Product as Colourway
              </label>
              <div className="flex gap-2">
                <select
                  id="link-variant-select"
                  className="flex-1 bg-white border border-[#ded5c7] px-3 py-2 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
                  defaultValue=""
                  onChange={e => {
                    const selectedId = e.target.value;
                    if (selectedId && !linkedVariantIds.includes(selectedId)) {
                      setLinkedVariantIds(prev => [...prev, selectedId]);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="" disabled>Choose a product to link as colorway...</option>
                  {products
                    .filter(p => p.id !== product.id && !linkedVariantIds.includes(p.id))
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.colorName} ({p.sku || p.skuId || 'No SKU'} | ₹{p.sellingPrice ?? p.price})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-white border border-[#ded5c7] rounded-xs">
              <div>
                <span className="text-xs font-semibold text-[#181614] block">Availability</span>
                <span className="text-[11px] text-[#78716c]">Catalog purchase state</span>
              </div>
              <button
                type="button"
                onClick={() => setInStock(!inStock)}
                className={`px-3 py-1.5 rounded-xs text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  inStock
                    ? 'bg-[#15803d] text-white'
                    : 'bg-[#b91c1c] text-white'
                }`}
              >
                {inStock ? 'In Stock' : 'Sold Out'}
              </button>
            </div>

            <div className="p-3 bg-white border border-[#ded5c7] rounded-xs">
              <label className="text-xs font-semibold text-[#181614] block mb-1">
                Stock Quantity (Units)
              </label>
              <input
                type="number"
                min="0"
                value={stockQuantity}
                onChange={e => setStockQuantity(e.target.value)}
                className="w-full bg-[#fbf9f5] border border-[#ded5c7] px-2.5 py-1 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block mb-1">
              Leather / Material Origin
            </label>
            <input
              type="text"
              value={material}
              onChange={e => setMaterial(e.target.value)}
              className="w-full bg-white border border-[#ded5c7] px-3.5 py-2.5 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-white border border-[#ded5c7] px-3.5 py-2.5 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
            />
          </div>

          {/* SEARCH ENGINE OPTIMIZATION (SEO) */}
          <div className="p-4 bg-[#fcfbf9] border border-[#e8dfd2] rounded-xs space-y-3">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#181614] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#8c562e]" />
                <span>Search Engine Optimization (SEO)</span>
              </h4>
              <p className="text-[11px] text-[#78716c] mt-0.5">
                Define custom meta tags for search engines, social shares, and browser tab titles.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#181614]">
                    SEO Title
                  </label>
                  <span className={`text-[10px] ${seoTitle.length > 60 ? 'text-[#b45309] font-medium' : 'text-[#8c857d]'}`}>
                    {seoTitle.length}/60 chars (Recommended: 50–60)
                  </span>
                </div>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={e => setSeoTitle(e.target.value)}
                  placeholder="e.g. Heritage Bifold Wallet — Luxury Italian Leather | STUNNING BIRDS"
                  className="w-full bg-white border border-[#ded5c7] px-3.5 py-2.5 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#181614]">
                    SEO Meta Description
                  </label>
                  <span className={`text-[10px] ${seoMetaDescription.length > 160 ? 'text-[#b45309] font-medium' : 'text-[#8c857d]'}`}>
                    {seoMetaDescription.length}/160 chars (Recommended: 120–160)
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={seoMetaDescription}
                  onChange={e => setSeoMetaDescription(e.target.value)}
                  placeholder="e.g. Discover our handcrafted Tuscan leather bifold wallet. Heirloom craftsmanship, personalized monogramming, and express nationwide delivery."
                  className="w-full bg-white border border-[#ded5c7] px-3.5 py-2.5 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
                />
              </div>
            </div>
          </div>

          {/* DYNAMIC PRODUCT HIGHLIGHTS SECTION */}
          <div className="p-4 bg-[#f6f2ea] border border-[#ded5c7] rounded-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#181614] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#8c562e]" />
                  <span>Product Highlights</span>
                </h4>
                <p className="text-[11px] text-[#78716c]">
                  Key-value specification pairs displayed on the customer product page.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddHighlight}
                className="px-2.5 py-1 bg-white hover:bg-[#ede5d8] text-[#8c562e] border border-[#ded5c7] rounded-xs text-xs font-semibold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add Row</span>
              </button>
            </div>

            <div className="space-y-2">
              {highlights.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#8c857d] bg-white rounded-xs border border-dashed border-[#ded5c7]">
                  No highlights added yet. Click &quot;Add Row&quot; to define custom product specifications.
                </div>
              ) : (
                highlights.map((hl, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Feature (e.g. Material)"
                      value={hl.label}
                      onChange={e => handleUpdateHighlight(idx, 'label', e.target.value)}
                      className="w-1/3 bg-white border border-[#ded5c7] px-3 py-2 text-xs text-[#181614] font-medium rounded-xs focus:outline-none focus:border-[#8c562e]"
                    />
                    <input
                      type="text"
                      placeholder="Specification / Details (e.g. Full-Grain Leather)"
                      value={hl.value}
                      onChange={e => handleUpdateHighlight(idx, 'value', e.target.value)}
                      className="flex-1 bg-white border border-[#ded5c7] px-3 py-2 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveHighlight(idx)}
                      className="p-2 text-[#9ca3af] hover:text-[#dc2626] rounded-xs transition-colors cursor-pointer"
                      title="Remove highlight"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3-4 JPG/JPEG IMAGES UPLOADER */}
          <div className="pt-2">
            <ImageGalleryUploader
              images={images}
              onChange={setImages}
              maxImages={4}
            />
          </div>

          <div className="pt-4 border-t border-[#e4dcd0] flex justify-between items-center">
            {showDeleteConfirm ? (
              <div className="flex items-center space-x-2 bg-red-50 border border-red-200 p-1.5 rounded-xs">
                <span className="text-[11px] font-medium text-red-800">Confirm deletion?</span>
                <button
                  type="button"
                  id="confirm-modal-delete-btn"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded-xs transition-colors cursor-pointer"
                >
                  {isDeleting ? 'Removing...' : 'Yes, Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-1 text-[11px] text-[#78716c] hover:text-[#181614] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="edit-modal-delete-trigger-btn"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 bg-[#fee2e2] hover:bg-[#fecaca] text-[#b91c1c] text-xs font-semibold rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Piece</span>
              </button>
            )}

            <div className="flex space-x-2">
              <button
                type="button"
                disabled={isSubmitting || isDeleting}
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#554e47] hover:text-black cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="px-6 py-2.5 bg-[#8c562e] hover:bg-[#734320] text-white text-xs font-semibold uppercase tracking-widest rounded-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-75"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing with Storage...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};

