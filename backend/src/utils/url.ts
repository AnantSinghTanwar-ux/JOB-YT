/**
 * Normalizes a URL by ensuring it starts with http:// or https://.
 * If the URL is empty or invalid, it returns null.
 */
export const normalizeUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed === '') return null;
  
  // If it already starts with http://, https://, or is a local path (starts with /), return it as is
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed;
  }
  
  // Otherwise, prepend https://
  return `https://${trimmed}`;
};

/**
 * Normalizes a LinkedIn URL, enforcing that it belongs to linkedin.com.
 * Returns null if the value is empty or doesn't belong to linkedin.com.
 */
export const normalizeLinkedInUrl = (url?: string | null): string | null => {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;
  
  const withoutProtocol = normalized.replace(/^https?:\/\//i, '').toLowerCase();
  if (
    !withoutProtocol.startsWith('linkedin.com/') &&
    !withoutProtocol.startsWith('www.linkedin.com/')
  ) {
    // Not a LinkedIn URL — return null to prevent invalid data from being stored
    return null;
  }
  
  return normalized;
};

/**
 * Normalizes stored asset URLs so old malformed upload values still render.
 * - `uploads/...` -> `/uploads/...`
 * - `https://uploads/...` -> `/uploads/...`
 * - other absolute URLs are returned as-is
 */
export const normalizeStoredAssetUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (/^https?:\/+\/uploads(?:[:/]|$)/i.test(trimmed)) {
    const pathname = trimmed.replace(/^https?:\/+\/uploads(?:[:/]|$)/i, '').replace(/^\/+/, '');
    return pathname ? `/uploads/${pathname}` : '/uploads';
  }

  if (trimmed.startsWith('uploads/')) {
    return `/${trimmed}`;
  }

  if (trimmed.startsWith('/uploads/')) {
    return trimmed;
  }

  return trimmed;
};

