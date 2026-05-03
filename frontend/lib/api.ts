/**
 * Central API base URL resolver.
 *
 * The Vercel env var is named NEXT_PUBLIC_API_BASE_URL (not NEXT_PUBLIC_API_URL).
 * This helper reads that var and falls back gracefully so we never build
 * `undefined/api/v1/...` URLs.
 *
 * Priority:
 *  1. NEXT_PUBLIC_API_BASE_URL  (set in Vercel → Settings → Environment Variables)
 *  2. NEXT_PUBLIC_API_URL       (legacy fallback)
 *  3. Hardcoded prod origin     (last resort — update PROD_FALLBACK if URL changes)
 *  4. localhost:8000            (local dev)
 */

const PROD_FALLBACK = 'https://krino-backend.onrender.com';

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
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return PROD_FALLBACK;
  }
  return 'http://localhost:8000';
}

/** Build a full API URL from a path like '/api/v1/interview/sessions' */
export function apiUrl(path: string): string {
  return `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
}
