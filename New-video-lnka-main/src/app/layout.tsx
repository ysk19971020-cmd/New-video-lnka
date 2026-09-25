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
