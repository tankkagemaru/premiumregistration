import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the offer-letter fonts + logo are bundled into the serverless
  // function on Vercel (they're read from disk at runtime by @react-pdf).
  outputFileTracingIncludes: {
    "/api/offer": ["./lib/pdf/fonts/**", "./public/pecsb-logo.png"],
  },
};

export default nextConfig;
