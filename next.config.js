/** @type {import('next').NextConfig} */
const nextConfig = {
  // appDir is removed; Next.js automatically finds src/app
  
  experimental: {
    // In newer versions, allowedOrigins usually sits under 'experimental'
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '192.168.0.7:3000',
      ],
    },
  },

  reactStrictMode: true,
  // swcMinify is removed as it is now the default behavior
};

module.exports = nextConfig;