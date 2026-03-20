import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    webpackBuildWorker: true,
  },
  // Discord iframe development origins
  allowedDevOrigins: [
    '*.discordsays.com',
    'discordsays.com',
    'discord.com',
    '*.trycloudflare.com',
  ],
  // Allow embedded pages to run inside Discord iframe
  async headers() {
    const discordCsp = "frame-ancestors 'self' https://discord.com https://*.discordsays.com; connect-src 'self' https://discord.com https://*.discordsays.com https://*.supabase.co wss://*.supabase.co data: blob:; media-src 'self' https://*.supabase.co blob:";
    const embeddedSources = ['/activity/:path*', '/dashboard/:path*', '/chat/:path*'];

    return embeddedSources.map((source) => ({
      source,
      headers: [
        {
          key: 'Content-Security-Policy',
          value: discordCsp,
        },
      ],
    }));
  },
  // Discord Activity proxy rewrite
  async rewrites() {
    return [
      {
        source: '/activity/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  serverExternalPackages: [
    'discord.js',
    '@discordjs/ws',
    'zlib-sync',
  ],
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
      {
        protocol: 'https',
        hostname: 'media.discordapp.net',
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
