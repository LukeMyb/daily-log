import type { NextConfig } from "next";

const allowedHost = process.env.HOST || "100.88.57.78";

const nextConfig: NextConfig = {
  allowedDevOrigins: [allowedHost],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
