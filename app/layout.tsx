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
};

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-black text-white">
        {!isSupabaseConfigured() && <SetupBanner />}
        {children}
      </body>
    </html>
  );
}
