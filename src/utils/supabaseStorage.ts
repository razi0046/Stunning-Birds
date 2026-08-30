import { supabase } from '../supabaseClient';

export const PRODUCT_STORAGE_BUCKET = 'product-images';

/**
 * Converts a base64 Data URL string to a Blob
 */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; contentType: string; extension: string } {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'image/jpeg';
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  let extension = 'jpg';
  if (contentType.includes('png')) extension = 'png';
  else if (contentType.includes('webp')) extension = 'webp';
  else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg';

  return {
    blob: new Blob([uInt8Array], { type: contentType }),
    contentType,
    extension,
  };
}

/**
 * Extracts storage relative file path from a Supabase Storage public URL
 * e.g. "https://xyz.supabase.co/storage/v1/object/public/product-images/products/prod-1/photo.jpg"
 * -> "products/prod-1/photo.jpg"
 */
export function extractStoragePath(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const marker = `/${PRODUCT_STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx !== -1) {
    const rawPath = url.substring(idx + marker.length);
    // Remove query params if any
    return decodeURIComponent(rawPath.split('?')[0]);
  }
  return null;
}

/**
 * Uploads a single image (File, Blob, or base64 dataUrl) to Supabase Storage bucket 'product-images'
 * Storage Path: products/{productId}/{unique_filename}
 */
export async function uploadProductImage(
  productId: string,
  source: File | Blob | string,
  index: number = 0
): Promise<string> {
  // If it is already a permanent URL (not base64 and not blob url), keep as is
  if (typeof source === 'string') {
    if (!source.startsWith('data:') && !source.startsWith('blob:')) {
      return source;
    }
  }

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  let fileBlob: Blob;
  let contentType = 'image/jpeg';
  let ext = 'jpg';

  if (typeof source === 'string' && source.startsWith('data:')) {
    const parsed = dataUrlToBlob(source);
    fileBlob = parsed.blob;
    contentType = parsed.contentType;
    ext = parsed.extension;
  } else if (source instanceof File) {
    fileBlob = source;
    contentType = source.type || 'image/jpeg';
    const nameParts = source.name.split('.');
    ext = nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : 'jpg';
  } else if (source instanceof Blob) {
    fileBlob = source;
    contentType = source.type || 'image/jpeg';
  } else {
    // If it's a blob: URL, fetch the blob
    try {
      const resp = await fetch(source as string);
      fileBlob = await resp.blob();
      contentType = fileBlob.type || 'image/jpeg';
    } catch {
      return typeof source === 'string' ? source : '';
    }
  }

  const cleanProductId = productId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueFilename = `angle-${index + 1}-${timestamp}-${randomStr}.${ext}`;
  const filePath = `products/${cleanProductId}/${uniqueFilename}`;

  // Verify active Supabase authentication session
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session?.user) {
    throw new Error('Unauthorized: An active administrator session is required to upload product images to Storage.');
  }

  // Upload to Supabase Storage bucket
  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_STORAGE_BUCKET)
    .upload(filePath, fileBlob, {
      contentType,
      upsert: true,
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('Supabase Storage upload error:', uploadError);
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Get permanent public URL
  const { data: publicUrlData } = supabase.storage
    .from(PRODUCT_STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

/**
 * Uploads all new images for a product and returns the complete updated array of permanent URLs
 */
export async function uploadProductImagesList(
  productId: string,
  imagesList: (string | File)[]
): Promise<string[]> {
  const uploadedUrls: string[] = [];

  for (let i = 0; i < imagesList.length; i++) {
    const item = imagesList[i];
    if (typeof item === 'string' && !item.startsWith('data:') && !item.startsWith('blob:')) {
      // Existing remote URL, keep as is
      uploadedUrls.push(item);
    } else {
      // New image requiring upload to Supabase Storage
      const permanentUrl = await uploadProductImage(productId, item as any, i);
      uploadedUrls.push(permanentUrl);
    }
  }

  return uploadedUrls;
}

/**
 * Deletes a single image file from Supabase Storage if it belongs to product-images
 */
export async function deleteProductImageFromStorage(imageUrl: string): Promise<boolean> {
  const path = extractStoragePath(imageUrl);
  if (!path) return false;

  try {
    const { error } = await supabase.storage
      .from(PRODUCT_STORAGE_BUCKET)
      .remove([path]);

    if (error) {
      console.warn('Failed to delete image from Supabase Storage:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error deleting image from Supabase Storage:', err);
    return false;
  }
}

/**
 * Deletes multiple images from Supabase Storage
 */
/**
 * Deletes multiple images from Supabase Storage, skipping any that are referenced elsewhere
 */
export async function deleteProductImagesFromStorage(
  imageUrls: string[],
  otherReferencedUrls: string[] = []
): Promise<void> {
  const protectedPaths = new Set(
    otherReferencedUrls
      .map(extractStoragePath)
      .filter((p): p is string => Boolean(p))
  );

  const pathsToDelete = imageUrls
    .map(extractStoragePath)
    .filter((p): p is string => Boolean(p) && !protectedPaths.has(p));

  if (pathsToDelete.length === 0) return;

  try {
    const { error } = await supabase.storage.from(PRODUCT_STORAGE_BUCKET).remove(pathsToDelete);
    if (error) {
      console.warn('Notice while deleting images from Supabase Storage:', error);
    }
  } catch (err) {
    console.warn('Error deleting images from Supabase Storage:', err);
  }
}

/**
 * Deletes all files in a product folder in Supabase Storage (e.g. during product deletion),
 * skipping any files still referenced by other products.
 */
export async function deleteProductFolderFromStorage(
  productId: string,
  knownImageUrls: string[] = [],
  otherReferencedUrls: string[] = []
): Promise<void> {
  const cleanProductId = productId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const folderPath = `products/${cleanProductId}`;

  // 1. Delete known image URLs first if safe
  if (knownImageUrls.length > 0) {
    await deleteProductImagesFromStorage(knownImageUrls, otherReferencedUrls);
  }

  // 2. List remaining files inside folder and delete unreferenced files
  try {
    const { data: fileList, error: listError } = await supabase.storage
      .from(PRODUCT_STORAGE_BUCKET)
      .list(folderPath);

    if (!listError && fileList && fileList.length > 0) {
      const protectedPaths = new Set(
        otherReferencedUrls
          .map(extractStoragePath)
          .filter((p): p is string => Boolean(p))
      );

      const filePathsToDelete = fileList
        .map(f => `${folderPath}/${f.name}`)
        .filter(path => !protectedPaths.has(path));

      if (filePathsToDelete.length > 0) {
        await supabase.storage.from(PRODUCT_STORAGE_BUCKET).remove(filePathsToDelete);
      }
    }
  } catch (e) {
    console.warn('Error cleaning up product storage folder:', e);
  }
}

