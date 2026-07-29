import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/shop/app-providers";
import { CartDrawer } from "@/components/shop/cart-drawer";

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Blinkit AI - AI-Assisted Quick Commerce Grocery Shopping",
    template: "%s | Blinkit AI"
  },
  description: "AI-assisted quick commerce grocery shopping for India. Get groceries delivered in 10-15 minutes with smart AI recommendations.",
  keywords: ["grocery", "quick commerce", "AI shopping", "Blinkit", "India", "delivery", "online shopping"],
  authors: [{ name: "Blinkit AI" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "Blinkit AI",
    title: "Blinkit AI - AI-Assisted Quick Commerce Grocery Shopping",
    description: "AI-assisted quick commerce grocery shopping for India. Get groceries delivered in 10-15 minutes with smart AI recommendations.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Blinkit AI - Groceries in minutes, smarter after every add"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Blinkit AI - AI-Assisted Quick Commerce Grocery Shopping",
    description: "AI-assisted quick commerce grocery shopping for India. Get groceries delivered in 10-15 minutes.",
    images: ["/og-image.png"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  verification: {
    google: "google-site-verification-code"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className={inter.className}>
        <AppProviders>
          {children}
          <CartDrawer />
        </AppProviders>
      </body>
    </html>
  );
}
