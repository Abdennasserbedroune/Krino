/**
 * Central API base URL resolver.
 * Prevents the classic `undefined/api/v1/...` bug when NEXT_PUBLIC_API_URL
 * is not set in the Vercel environment.
 *
 * Priority:
 *  1. NEXT_PUBLIC_API_URL env var (set this in Vercel → Settings → Environment Variables)
 *  2. Hardcoded production fallback (update PROD_FALLBACK below if your backend URL changes)
 *  3. localhost:8000 for local dev
 */

const PROD_FALLBACK = 'https://krino-backend.onrender.com'; // ← update if your backend URL differs

export function getApiBase(): string {
  const env = process.env.NEXT_PUBLIC_API_URL;
  // Guard: if undefined, empty string, or the literal string "undefined"
  if (env && env !== 'undefined' && env.trim() !== '') {
    return env.replace(/\/$/, ''); // strip trailing slash
  }
  // In production (Vercel), fall back to the known backend URL
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return PROD_FALLBACK;
  }
  return 'http://localhost:8000';
}

/** Convenience: build a full API path */
export function apiUrl(path: string): string {
  return `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
}
