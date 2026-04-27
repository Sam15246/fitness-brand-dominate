import type { NextConfig } from "next";
import path from "path";

const r2PublicHost = (process.env.NEXT_PUBLIC_R2_PUBLIC_HOST || "")
  .replace(/^https?:\/\//, "")
  .replace(/\/.*/, "");

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imagedelivery.net",
      },
      ...(r2PublicHost
        ? [
            {
              protocol: "https" as const,
              hostname: r2PublicHost,
              pathname: "/**",
            },
          ]
        : []),
    ],
  },
  async rewrites() {
    const backendBaseUrl = (process.env.BACKEND_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendBaseUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
