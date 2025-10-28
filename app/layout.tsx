import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner"
import "./globals.css";
import React from "react";

// Self-host the Geist Sans font and expose it as a CSS custom property.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Self-host the Geist Mono font for code-like typography.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StockResearcher",
  description: "Personalised Stock researcher",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Global app shell: render page content and shared toasts */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
