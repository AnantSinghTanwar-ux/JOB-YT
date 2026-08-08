import { API_BASE } from '@/constants';

/**
 * Resolve relative asset URLs to absolute URLs for images
 * @param url - The URL from API response (can be relative or absolute)
 * @returns Absolute URL or null if input is null/empty
 */
export const resolveAssetUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = API_BASE.replace(/\/api\/v1\/?$/, '');
  return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
};
