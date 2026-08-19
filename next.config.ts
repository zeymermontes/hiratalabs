import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  experimental: {
    serverActions: { bodySizeLimit: "100mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
    ];
  },
};

export default nextConfig;
