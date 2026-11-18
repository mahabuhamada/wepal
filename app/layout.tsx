import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./home.css";
import "./portal.css";
import "./identity.css";
import "./mobile.css";
import "./member.css";
import { identityBootScript } from "./components/identity";

export const metadata: Metadata = {
  title: "ويبال | معرفة وحوار فلسطيني",
  description: "أخبار ومصادر وتحليلات موثوقة عن الحوار والمصالحة والشأن العام الفلسطيني.",
  icons: { icon: "/brand/forum/favicon.svg", shortcut: "/brand/forum/favicon.svg", apple: "/app/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ويبال", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" data-identity="forum" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: identityBootScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
