import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["thread-stream", "pino"],
  turbopack: {
    root: __dirname,
  },
  // Dev-only: lets the tunnel host load client assets/HMR. Wildcard covers
  // tunnelmole's rotating subdomains; add other tunnel hosts as needed.
  allowedDevOrigins: ["127.0.0.1", "*.tunnelmole.net"],
};

export default nextConfig;
