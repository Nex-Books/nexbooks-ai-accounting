/** @type {import('next').NextConfig} */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH,
  images: {
    domains: [
      'images.unsplash.com',
      'i.ibb.co',
      'scontent.fotp8-1.fna.fbcdn.net',
    ],
    // Make ENV
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: '/finance/:path*',
        destination: `${BACKEND_URL}/finance/:path*`,
      },
      {
        source: '/accounts/:path*',
        destination: `${BACKEND_URL}/accounts/:path*`,
      },
      {
        source: '/business/:path*',
        destination: `${BACKEND_URL}/business/:path*`,
      },
      {
        source: '/chat/:path*',
        destination: `${BACKEND_URL}/chat/:path*`,
      },
      {
        source: '/bank/:path*',
        destination: `${BACKEND_URL}/bank/:path*`,
      },
      {
        source: '/parties/:path*',
        destination: `${BACKEND_URL}/parties/:path*`,
      },
      {
        source: '/health',
        destination: `${BACKEND_URL}/health`,
      },
    ];
  },
};

// module.exports = withTM(nextConfig);
module.exports = nextConfig;

