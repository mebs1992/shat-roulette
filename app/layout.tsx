import type { Metadata, Viewport } from "next";
import { FontStylesheet } from "@/components/FontStylesheet";
import { Heartbeat } from "@/components/Heartbeat";
import { RegisterSW } from "@/components/RegisterSW";
import { SessionProvider } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shat Roulette",
  description: "Random chat for people who are currently on the toilet.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#EFE4D2",
};

const FONTS =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800" +
  "&family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Preload only — never a blocking stylesheet. See FontStylesheet. */}
        <link rel="preload" as="style" href={FONTS} />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Shat" />
      </head>
      <body>
        <FontStylesheet href={FONTS} />
        <Heartbeat />
        <RegisterSW />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
