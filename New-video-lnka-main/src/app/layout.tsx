import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/lib/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VideoLanka Dashboard - Upload • Watch • Earn",
  description: "VideoLanka - Monetized video streaming and management platform. Upload videos, watch content, earn money, refer friends, and withdraw earnings.",
  keywords: ["VideoLanka", "video streaming", "earn money", "Sri Lanka", "video platform"],
  authors: [{ name: "VideoLanka" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="si" suppressHydrationWarning>
      <meta name="clckd" content="d753b2a324b61bb5a5ec855f17394f21" />
      <meta name="5abc9147bb0528ff785b21690153c8df5753304a" content="5abc9147bb0528ff785b21690153c8df5753304a" />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#f7fbff] text-[#0b1220]`}
      >
        <QueryProvider>
          {children}
        </QueryProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
