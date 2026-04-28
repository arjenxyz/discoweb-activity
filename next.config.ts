import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbo: false,
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
      // Static public assets — Activity iframe'de /activity/ prefix ile istenir
      { source: '/activity/store-background/:path*', destination: '/store-background/:path*' },
      { source: '/activity/menu-background/:path*', destination: '/menu-background/:path*' },
      { source: '/activity/flags/:path*', destination: '/flags/:path*' },
      { source: '/activity/gif/:path*', destination: '/gif/:path*' },
      { source: '/activity/background/:path*', destination: '/background/:path*' },
      { source: '/activity/icon/:path*', destination: '/icon/:path*' },
      { source: '/activity/penguin/:path*', destination: '/penguin/:path*' },
      // Supabase storage assets → same-origin (Discord CSP için)
      {
        source: '/cdn/:path*',
        destination: 'https://dotmvirtfyepdpcvgucc.supabase.co/storage/v1/object/public/:path*',
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
