import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // GitHub Pages 배포 시 basePath 설정
  basePath: isProd ? "/MHive" : "",
  assetPrefix: isProd ? "/MHive/" : "",
};

export default nextConfig;
