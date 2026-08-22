import { API_BASE } from '@/constants';

/**
 * Resolve relative asset URLs to absolute URLs for images
 * @param url - The URL from API response (can be relative or absolute)
 * @returns Absolute URL or null if input is null/empty
 */
export const resolveAssetUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const origin = API_BASE.replace(/\/api\/v1\/?$/, '');
  if (/^https?:\/\/uploads(?:[:/]|$)/i.test(url)) {
    const pathname = url.replace(/^https?:\/\/uploads(?:[:/]|$)/i, '').replace(/^\/+/, '');
    return `${origin}/${pathname}`;
  }
  if (/^https?:\/\//i.test(url)) return url;
  const normalized = url.replace(/^\/+/, '');
  return `${origin}/${normalized}`;
};
