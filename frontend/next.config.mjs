/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Skip ESLint during production builds (unescaped entity warnings)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip type errors during production builds
    ignoreBuildErrors: true,
  },
  experimental: {
    typedRoutes: true,
    // Keep these packages out of the webpack bundle — they need
    // native fs access and their own internal file structure at runtime.
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
  },
  // Vercel serverless function configuration
  serverRuntimeConfig: {
    // Server-only runtime config
  },
  publicRuntimeConfig: {
    // Available on both server and client
  },
  // Vercel handles deployment output automatically — do NOT use 'standalone'
  // as it strips files needed by pdf-parse and mammoth at runtime.
  reactStrictMode: true,
  // Optimize images for Vercel
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Add remote image domains here if needed
    ],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
