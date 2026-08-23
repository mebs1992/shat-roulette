import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Defaults are right for this app: no ISR cache to configure, no queue —
// every route is either static or client-rendered.
export default defineCloudflareConfig({});
