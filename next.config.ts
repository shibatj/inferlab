import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Pick the language for `/` without a server function: a cookie set by the language
  // switch, else Thai.
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "cookie", key: "lang", value: "en" }],
        destination: "/en",
        permanent: false,
      },
      { source: "/", destination: "/th", permanent: false },
    ];
  },
  partialPrefetching: true,
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
