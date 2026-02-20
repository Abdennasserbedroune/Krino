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
  },
  // Vercel serverless function configuration
  serverRuntimeConfig: {
    // Server-only runtime config
  },
  publicRuntimeConfig: {
    // Available on both server and client
  },
  // Output standalone for optimal Vercel deployment
  output: 'standalone',
  // Enable React strict mode for better development practices
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
