import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native libs (sharp, @napi-rs/canvas) must not be bundled — keep external.
  serverExternalPackages: ["sharp", "@napi-rs/canvas"],
};

export default nextConfig;
