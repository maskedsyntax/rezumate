import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rezumate.app"),
  applicationName: "Rezumate",
  title: {
    default: "Rezumate - Native iOS resume optimizer",
    template: "%s | Rezumate"
  },
  description: "Upload a resume, paste a job description, and get ATS scoring, missing keywords, bullet rewrites, and export-ready improvements on iPhone.",
  keywords: [
    "resume optimizer",
    "ATS resume checker",
    "iOS resume app",
    "resume feedback",
    "job description matching",
    "resume bullet rewrite"
  ],
  authors: [{ name: "Rezumate" }],
  creator: "Rezumate",
  publisher: "Rezumate",
  alternates: {
    canonical: "/"
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" }
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }]
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Rezumate",
    title: "Rezumate - Native iOS resume optimizer",
    description: "ATS scoring, missing keywords, bullet rewrites, and export-ready resume improvements on iPhone.",
    images: [
      {
        url: "/rezumate-logo.png",
        width: 378,
        height: 378,
        alt: "Rezumate logo"
      }
    ]
  },
  twitter: {
    card: "summary",
    title: "Rezumate - Native iOS resume optimizer",
    description: "ATS scoring, missing keywords, bullet rewrites, and export-ready resume improvements on iPhone.",
    images: ["/rezumate-logo.png"]
  },
  appleWebApp: {
    capable: true,
    title: "Rezumate",
    statusBarStyle: "default"
  },
  category: "productivity"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
