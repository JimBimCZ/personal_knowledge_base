import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle so the runtime image does not need
  // node_modules. See Dockerfile.
  output: "standalone",
};

export default nextConfig;
