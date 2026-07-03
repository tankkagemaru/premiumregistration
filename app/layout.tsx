import type { Metadata } from "next";
import { Playfair_Display, Inter, JetBrains_Mono } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/context";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const DESCRIPTION =
  "Register your interest in English programs, university placement in Malaysia, or corporate training with Premium Entrepreneur Consultant Sdn Bhd (PECSB).";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Register — PECSB",
    template: "%s — PECSB",
  },
  description: DESCRIPTION,
  keywords: [
    "English courses Malaysia",
    "study in Malaysia",
    "university placement Malaysia",
    "IELTS preparation",
    "corporate training HRDF",
    "PECSB",
    "Premium Language Centre",
  ],
  applicationName: "regist·er",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/pecsb-logo.png", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    siteName: "PECSB · regist·er",
    title: "Register — PECSB",
    description: DESCRIPTION,
    url: APP_URL,
    images: [{ url: "/pecsb-logo.png", width: 1080, height: 1080, alt: "PECSB" }],
  },
  twitter: {
    card: "summary",
    title: "Register — PECSB",
    description: DESCRIPTION,
    images: ["/pecsb-logo.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
