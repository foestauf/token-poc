import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@token-poc/token-utils'],
};

export default nextConfig;
