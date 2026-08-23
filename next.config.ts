import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

// Gives `next dev` the same Cloudflare bindings the deployed Worker has,
// so D1 works locally without a second code path.
initOpenNextCloudflareForDev();

export default nextConfig;
