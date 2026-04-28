/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
        encoding: false,   // face-api.js → node-fetch → encoding (not needed in browser)
        'node-fetch': false,
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5001/:path*', // Proxy to NestJS Backend root
      },
    ]
  },
};

export default nextConfig;
