/**
 * Central API base URL resolver.
 *
 * IMPORTANT: Do NOT use `typeof window` or any browser-only APIs here.
 * This file is imported by both server and client components.
 * Using window causes React hydration mismatches (errors #418, #423, #425).
 *
 * Rule: resolve the URL purely from env vars at build time.
 * - In Vercel: set NEXT_PUBLIC_API_BASE_URL in project Settings → Environment Variables
 *   then trigger a new deployment (env vars only take effect on new builds).
 * - In local dev: set NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001 in frontend/.env.local
 */

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
  // If no env var is set the build is misconfigured.
  // Return a clearly broken URL so the error is obvious in the network tab.
  return 'http://MISSING_API_BASE_URL';
}

/** Build a full API URL from a path like '/api/v1/interview/sessions' */
export function apiUrl(path: string): string {
  return `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
}
