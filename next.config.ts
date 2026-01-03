import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ok.166.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.166.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'vod.cc.163.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
