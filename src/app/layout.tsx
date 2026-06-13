import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://trustlayer.xyz"),
  title: "TrustLayer — Credit score for AI agents",
  description:
    "TrustLayer is the wallet-agnostic preflight check for AI agents. Before you connect your wallet, you check the score. Mechanical first, AI explains.",
  keywords: [
    "AI agents",
    "crypto security",
    "trust score",
    "smart contract audit",
    "Slither",
    "Dedaub",
    "wallet safety",
    "preflight check",
  ],
  authors: [{ name: "TrustLayer" }],
  openGraph: {
    title: "TrustLayer — Credit score for AI agents",
    description:
      "Before you connect your wallet to an AI agent, check the score. An 8-step mechanical pipeline. Grades A+ to F.",
    type: "website",
    url: "https://trustlayer.xyz",
    siteName: "TrustLayer",
    images: [{ url: "/logo.jpg", width: 1200, height: 630, alt: "TrustLayer" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrustLayer — Credit score for AI agents",
    description:
      "Before you connect your wallet to an AI agent, check the score. Mechanical first, AI explains.",
    images: ["/logo.jpg"],
  },
  icons: {
    icon: [{ url: "/logo.jpg", type: "image/jpeg" }],
    apple: [{ url: "/logo.jpg" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-fg selection:bg-brand/20">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
