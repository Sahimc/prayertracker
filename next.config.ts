import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.prayertracker-ten.vercel.app',
          },
        ],
        destination: 'https://prayertracker-ten.vercel.app/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
