import React, { useState } from 'react';
import { X, Plus, Sparkles, Trash2, RefreshCw } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { ProductCategory, ProductHighlight } from '../types';
import { ImageGalleryUploader } from './ImageGalleryUploader';

interface Props {
  onClose: () => void;
}

export const AdminNewProductModal: React.FC<Props> = ({ onClose }) => {
  const { addNewProduct, products } = useShop();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [skuError, setSkuError] = useState<string | null>(null);
  const [price, setPrice] = useState('9990');
  const [mrp, setMrp] = useState('14990');
  const [category, setCategory] = useState<ProductCategory>('Bifold Wallets');
  const [colorName, setColorName] = useState('Espresso Bridle');
  const [colorHex, setColorHex] = useState('#3a2012');
  const [material, setMaterial] = useState('Full-Grain Italian Calfskin');
  const [description, setDescription] = useState('Hand-cut, hand-burnished bespoke leather wallet crafted with heirloom durability.');
  const [images, setImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=85',
  ]);
  const [badge, setBadge] = useState('NEW');
  const [stockQuantity, setStockQuantity] = useState('50');
  const [formError, setFormError] = useState<string | null>(null);

  // Dynamic Product Highlights Key-Value state
  const [highlights, setHighlights] = useState<ProductHighlight[]>([
    { label: 'Leather Grade', value: 'Full-Grain Italian Calfskin' },
    { label: 'Card Slots', value: '6 Dedicated Slots + 2 Hidden Compartments' },
    { label: 'RFID Protection', value: 'Certified Faraday RFID Blocking Layer' },
    { label: 'Dimensions', value: '4.2" Length x 3.2" Height x 0.4" Depth' },
  ]);

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
      const isDuplicate = products.some(p => (p.sku && p.sku.toUpperCase() === val) || (p.skuId && p.skuId.toUpperCase() === val));
      if (isDuplicate) {
        setSkuError('Warning: This SKU ID is already in use by another product');
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
      alert('Please upload or select at least 1 JPG image (3–4 recommended).');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      // Filter non-empty highlights
      const validHighlights = highlights.filter(h => h.label.trim() && h.value.trim());
      const parsedPrice = parseFloat(price) || 9990;
      const parsedMrp = mrp.trim() ? parseFloat(mrp) : undefined;

      await addNewProduct({
        name: name.trim(),
        sku: cleanSku,
        skuId: cleanSku,
        price: parsedPrice,
        sellingPrice: parsedPrice,
        selling_price: parsedPrice,
        originalPrice: parsedMrp,
        mrp: parsedMrp,
        original_price: parsedMrp,
        category,
        colorName: colorName.trim(),
        colorHex,
        material: material.trim(),
        description: description.trim(),
        images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1200&q=85'],
        badge: badge ? (badge as any) : undefined,
        stockQuantity: parseInt(stockQuantity, 10) || 0,
        productHighlights: validHighlights,
      });

      onClose();
    } catch (err: any) {
      console.error('Failed to create product:', err);
      setFormError(err?.message || 'Failed to upload images and create product. Please check console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#fbf9f5] rounded-lg shadow-2xl border border-[#ded5c7] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-6 bg-[#f6f2ea] border-b border-[#e4dcd0] flex justify-between items-center">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[#8c562e] font-bold">Commerce Manager</span>
            <h3 className="font-serif-luxury text-xl font-bold text-[#181614]">
              Add New Atelier Piece
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
          
          {/* Title & SKU Row */}
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
                placeholder="14990 (Optional)"
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
                Badge
              </label>
              <select
                value={badge}
                onChange={e => setBadge(e.target.value)}
                className="w-full bg-white border border-[#ded5c7] px-3.5 py-2.5 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
              >
                <option value="NEW">NEW</option>
                <option value="BESTSELLER">BESTSELLER</option>
                <option value="LIMITED EDITION">LIMITED EDITION</option>
                <option value="">None</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block mb-1">
                Initial Stock
              </label>
              <input
                type="number"
                min="0"
                value={stockQuantity}
                onChange={e => setStockQuantity(e.target.value)}
                className="w-full bg-white border border-[#ded5c7] px-3.5 py-2.5 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
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
              placeholder="e.g. Vegetable Tanned Buttero Leather"
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

          <div className="pt-4 border-t border-[#e4dcd0] flex justify-end space-x-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#554e47] hover:text-black cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#8c562e] hover:bg-[#734320] text-white text-xs font-semibold uppercase tracking-widest rounded-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-2 disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading to Storage & Publishing...</span>
                </>
              ) : (
                <span>Publish Piece</span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

