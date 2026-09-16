import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow server-side environment variables to be accessible
  env: {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  },
};

export default nextConfig;
