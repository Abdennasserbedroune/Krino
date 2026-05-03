/**
 * Central API base URL resolver.
 *
 * Env var in Vercel: NEXT_PUBLIC_API_BASE_URL
 * Local dev: backend runs on http://127.0.0.1:8001
 *
 * Priority:
 *  1. NEXT_PUBLIC_API_BASE_URL  (Vercel env var — primary)
 *  2. NEXT_PUBLIC_API_URL       (legacy fallback)
 *  3. Hardcoded prod origin     (krino-backend.onrender.com, last resort in prod)
 *  4. http://127.0.0.1:8001    (local dev)
 */

const PROD_FALLBACK  = 'https://krino-backend.onrender.com';
const LOCAL_FALLBACK = 'http://127.0.0.1:8001';

export function getApiBase(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ];
  for (const v of candidates) {
    if (v && v !== 'undefined' && v.trim() !== '') {
      return v.replace(/\/$/, '');
    }
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return PROD_FALLBACK;
  }
  return LOCAL_FALLBACK;
}

/** Build a full API URL from a path like '/api/v1/interview/sessions' */
export function apiUrl(path: string): string {
  return `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
}
