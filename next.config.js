/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    proxyClientMaxBodySize: '20mb',
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '192.168.0.7:3000',
      ],
      bodySizeLimit: '20mb',
    },
  },

  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },

  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };

    return config;
  },
};

module.exports = nextConfig;
