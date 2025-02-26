import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    taint: true,
    // serverActions: {
    //   allowedOrigins: [
    //     "http://localhost",
    //     "verbose-yodel-4xrv557jf9gj-3000.app.github.dev",
    //   ],
    // },
  },
};

export default nextConfig;
