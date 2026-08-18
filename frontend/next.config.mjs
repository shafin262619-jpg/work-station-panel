/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    allowedHosts: ['.monkeycode-ai.live'],
  },
};

export default nextConfig;
