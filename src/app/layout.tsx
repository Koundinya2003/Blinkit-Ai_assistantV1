import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Header } from "@/components/shop/header";
import { CartDrawer } from "@/components/shop/cart-drawer";
import { Footer } from "@/components/shop/footer";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Blinkit — tell us what you want to accomplish",
    template: "%s | Blinkit",
  },
  description:
    "Describe a meal, a head count and a budget. Blinkit plans the dishes, works out the quantities and builds a shoppable basket of real products delivered in minutes.",
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Blinkit",
    title: "Blinkit — tell us what you want to accomplish",
    description: "Natural language in, a full basket of real groceries out.",
  },
};

export const viewport: Viewport = {
  themeColor: "#f8cb46",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={inter.variable}>
      <body className="font-sans">
        <Suspense fallback={<div className="h-[68px] border-b border-border bg-background" />}>
          <Header />
        </Suspense>
        <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-5">{children}</main>
        <Footer />
        <CartDrawer />
      </body>
    </html>
  );
}
