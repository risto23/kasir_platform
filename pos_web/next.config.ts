import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.88.249'],
  // allowedDevOrigins: ['192.168.1.3'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '4000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.3',
        port: '4000',
        pathname: '/**',
      },
    ],
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;