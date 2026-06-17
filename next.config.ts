import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects: async () => [
    {
      source: "/",
      destination: "/companies",
      permanent: false,
    },
  ],
};

export default nextConfig;
