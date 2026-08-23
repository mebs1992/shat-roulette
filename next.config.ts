import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Do not advertise the framework.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // No other site may frame the app (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // Browsers must honour declared content types.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Force HTTPS for two years, including subdomains.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Never leak the path in a cross-origin referer.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

// Gives `next dev` the same Cloudflare bindings the deployed Worker has,
// so D1 works locally without a second code path.
initOpenNextCloudflareForDev();

export default nextConfig;
