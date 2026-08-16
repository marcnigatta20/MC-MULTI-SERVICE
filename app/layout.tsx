import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SetupBanner } from "@/components/setup/setup-banner";
import { isSupabaseConfigured } from "@/lib/env";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MC Barber Management",
  description: "Plateforme de gestion financière pour barber shop",
  manifest: "/manifest.webmanifest",
  applicationName: "MC Multi-service",
  icons: {
    icon: [
      { url: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icone-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MC Multi-service",
  },
};

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    maximumScale: 1,
    themeColor: "#0a0a0a",
    colorScheme: "dark",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-black text-white [padding-bottom:env(safe-area-inset-bottom)] [padding-top:env(safe-area-inset-top)]">
        {!isSupabaseConfigured() && <SetupBanner />}
        {children}
      </body>
    </html>
  );
}
