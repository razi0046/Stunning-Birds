import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Trash2, ArrowLeft, ArrowRight, Star, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

// Preset luxury leather studio shots (JPG format) for quick demonstration/selection
const SAMPLE_JPG_STUDIO_SETS = [
  {
    name: 'Heritage Tan Set (4 Angles)',
    images: [
      'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=85',
    ],
  },
  {
    name: 'Espresso Bridle Set (4 Angles)',
    images: [
      'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1556774687-0e2fdd0116c0?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85',
    ],
  },
  {
    name: 'Obsidian Noir Set (3 Angles)',
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85',
    ],
  },
];

const ANGLE_LABELS = [
  'Cover / Hero Front',
  'Angle 2 (Interior & Slots)',
  'Angle 3 (Macro Stitching)',
  'Angle 4 (Scale & Profile)',
];

export const ImageGalleryUploader: React.FC<Props> = ({ images, onChange, maxImages = 4 }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processFiles = (files: FileList | File[]) => {
    setErrorMessage(null);
    const newImages: string[] = [];
    const validTypes = ['image/jpeg', 'image/jpg'];
    let rejectedCount = 0;

    Array.from(files).forEach((file) => {
      // Check if it is JPG / JPEG format
      const isJpg = validTypes.includes(file.type.toLowerCase()) || 
                    file.name.toLowerCase().endsWith('.jpg') || 
                    file.name.toLowerCase().endsWith('.jpeg');

      if (!isJpg) {
        rejectedCount++;
        return;
      }

      if (images.length + newImages.length < maxImages) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newImages.push(e.target.result as string);
            if (newImages.length === Math.min(files.length - rejectedCount, maxImages - images.length)) {
              onChange([...images, ...newImages].slice(0, maxImages));
            }
          }
        };
        reader.readAsDataURL(file);
      }
    });

    if (rejectedCount > 0) {
      setErrorMessage(`${rejectedCount} file(s) ignored. Only JPG / JPEG images (.jpg, .jpeg) are supported.`);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = ''; // Reset input to allow selecting same file again
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleSetAsCover = (index: number) => {
    if (index === 0) return;
    const target = images[index];
    const remaining = images.filter((_, i) => i !== index);
    onChange([target, ...remaining]);
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const reordered = [...images];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;
    onChange(reordered);
  };

  const handleLoadSampleSet = (sampleImages: string[]) => {
    setErrorMessage(null);
    onChange(sampleImages.slice(0, maxImages));
  };

  return (
    <div className="space-y-4">
      {/* Header & Status Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[#181614] flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-[#8c562e]" />
            <span>Product Photography (JPG / JPEG Only) *</span>
          </label>
          <p className="text-[11px] text-[#78716c]">
            Upload 3–4 studio angles (Hero, Interior, Macro Detail, Scale). Formats allowed: <span className="font-semibold text-[#8c562e]">.jpg, .jpeg</span>.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
              images.length >= 3
                ? 'bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]'
                : images.length > 0
                ? 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]'
                : 'bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca]'
            }`}
          >
            {images.length} / {maxImages} JPG Images
          </span>
        </div>
      </div>

      {/* Error / Alert notice */}
      {errorMessage && (
        <div className="p-3 bg-[#fef2f2] border border-[#fecaca] rounded-xs flex items-center gap-2 text-xs text-[#b91c1c] animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      {images.length < maxImages && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xs p-5 sm:p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-[#8c562e] bg-[#f5ede2] scale-[1.01]'
              : 'border-[#ded5c7] hover:border-[#8c562e] bg-[#fbf9f5] hover:bg-[#f6f2ea]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,image/jpeg"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#f6f0e6] border border-[#ded5c7] flex items-center justify-center text-[#8c562e]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#181614]">
                <span className="text-[#8c562e] underline underline-offset-2">Click to browse</span> or drag &amp; drop JPG/JPEG files
              </p>
              <p className="text-[11px] text-[#78716c] mt-0.5">
                Supports up to {maxImages} high-resolution JPG photos (at least 3 recommended for complete listing)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Image Thumbnails & Arrangement Grid */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="relative group bg-white border border-[#ded5c7] rounded-xs overflow-hidden shadow-2xs flex flex-col justify-between"
              >
                {/* Image & Angle Badge */}
                <div className="relative aspect-4/3 bg-[#f6f2ea] overflow-hidden">
                  <img
                    src={img}
                    alt={`Angle ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />

                  {/* Primary Cover Badge */}
                  {idx === 0 ? (
                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-[#181614]/90 backdrop-blur-xs text-[#d4af37] text-[9px] font-bold uppercase tracking-widest rounded-xs flex items-center gap-1 shadow-xs">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      <span>Main Cover</span>
                    </div>
                  ) : (
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#181614]/70 text-[#f5f1eb] text-[9px] font-medium tracking-wide rounded-xs">
                      Angle {idx + 1}
                    </div>
                  )}

                  {/* Format Tag */}
                  <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-white/90 text-[#8c562e] text-[9px] font-mono font-bold rounded-xs">
                    JPG
                  </div>
                </div>

                {/* Info & Angle Designation */}
                <div className="p-2 bg-[#fdfbf7] border-t border-[#eee7dc] flex flex-col justify-between flex-1">
                  <span className="text-[10px] font-medium text-[#78716c] truncate block mb-1.5">
                    {ANGLE_LABELS[idx] || `Angle ${idx + 1}`}
                  </span>

                  {/* Action Controls */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#f0eae0]">
                    <div className="flex items-center space-x-1">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'left')}
                          className="p-1 hover:bg-[#ede5d8] text-[#554e47] hover:text-[#181614] rounded-xs transition-colors cursor-pointer"
                          title="Move left"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                      )}
                      {idx < images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'right')}
                          className="p-1 hover:bg-[#ede5d8] text-[#554e47] hover:text-[#181614] rounded-xs transition-colors cursor-pointer"
                          title="Move right"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleSetAsCover(idx)}
                          className="px-1.5 py-0.5 text-[9px] font-semibold text-[#8c562e] hover:bg-[#ede5d8] rounded-xs transition-colors cursor-pointer"
                          title="Set as Main Cover"
                        >
                          Set Cover
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="p-1 text-[#9ca3af] hover:text-[#dc2626] hover:bg-[#fee2e2] rounded-xs transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {images.length < 3 && (
            <p className="text-[11px] text-[#d97706] flex items-center gap-1 pt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>We recommend uploading at least 3 JPG images for a complete customer product page experience.</span>
            </p>
          )}
        </div>
      )}

      {/* Quick Studio JPG Presets (Fallback Helper) */}
      <div className="p-3 bg-[#f6f2ea] border border-[#ded5c7] rounded-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#181614] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#8c562e]" />
            <span>Or load preset atelier 3–4 JPG studio angles:</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_JPG_STUDIO_SETS.map((set, sIdx) => (
            <button
              key={sIdx}
              type="button"
              onClick={() => handleLoadSampleSet(set.images)}
              className="px-2.5 py-1 bg-white hover:bg-[#ede5d8] border border-[#ded5c7] rounded-xs text-[11px] font-medium text-[#554e47] hover:text-[#181614] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3 h-3 text-[#8c562e]" />
              <span>{set.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
