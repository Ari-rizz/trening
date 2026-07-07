const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/raw\.githubusercontent\.com\/yuhonas\/free-exercise-db\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'exercise-images',
        expiration: { maxEntries: 2000, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-data',
        expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
        networkTimeoutSeconds: 5,
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // output: 'export' generates a static out/ folder for Capacitor native builds.
  // Netlify deployment continues to use the .next folder via @netlify/plugin-nextjs.
  // To build for native: set NEXT_EXPORT=true in your shell, then run npm run build:app
  ...(process.env.NEXT_EXPORT === 'true' ? { output: 'export', trailingSlash: true } : {}),
  images: {
    unoptimized: true,
    domains: ['raw.githubusercontent.com'],
  },
};

module.exports = withPWA(nextConfig);
