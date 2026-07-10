import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/": ["./public/data/douay-rheims/**/*.json"],
  },
};

export default nextConfig;
