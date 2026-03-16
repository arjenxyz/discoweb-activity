import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  experimental: {
    webpackBuildWorker: true,
  },
  // Discord iframe için development origin izni
  allowedDevOrigins: [
    'https://*.discordsays.com',
    'https://discord.com',
    'https://*.trycloudflare.com'
  ],
  // Activity sayfalarının Discord iframe'inde çalışmasına izin ver
  async headers() {
    return [
      {
        source: '/activity/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development' 
              ? "frame-ancestors 'self' https://discord.com https://*.discordsays.com; connect-src 'self' https://discord.com https://*.discordsays.com https://*.supabase.co wss://*.supabase.co data: blob:"
              : "frame-ancestors 'self' https://discord.com https://*.discordsays.com; connect-src 'self' https://discord.com https://*.discordsays.com https://*.supabase.co wss://*.supabase.co data: blob:",
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOW-FROM https://discord.com',
          },
        ],
      },
    ];
  },
  // Discord Activity proxy için /activity/api/* isteklerini /api/*'e yönlendir
  async rewrites() {
    return [
      {
        source: '/activity/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  // Tell Next to treat these packages as server externals (avoid bundling into ESM chunks)
  serverExternalPackages: [
    'discord.js',
    '@discordjs/ws',
    'zlib-sync',
  ],
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
      {
        protocol: "https",
        hostname: "media.discordapp.net",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'discord.js': 'commonjs discord.js',
        '@discordjs/ws': 'commonjs @discordjs/ws',
        'zlib-sync': 'commonjs zlib-sync',
      });
    }
    return config;
  },
};

export default nextConfig;
