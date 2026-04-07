import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.56.1', 'localhost:3000', 'localhost:3001', '127.0.0.1:3000'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none';" },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }
        ],
      },
    ];
  },
};

export default nextConfig;
