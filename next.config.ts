import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  // NOTE: Do NOT put secret keys here. This `env` block exposes values to the
  // client-side browser bundle. Server-only secrets (GROQ_API_KEY, MONGODB_URI)
  // are read directly via process.env inside API routes (which run server-side only).
  // Only NEXT_PUBLIC_* variables need to be listed here.
};


export default nextConfig;
