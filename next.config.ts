import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native libs (sharp, @napi-rs/canvas) must not be bundled — keep external.
  serverExternalPackages: ["sharp", "@napi-rs/canvas"],
  experimental: {
    // Base-image upload accepts up to 15 MB; default action body limit is 1 MB.
    serverActions: { bodySizeLimit: "16mb" },
  },
};

export default nextConfig;
