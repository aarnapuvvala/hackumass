import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HackUMass",
  description: "Order groceries, SNAP meals, and food-bank deliveries.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ea" },
    { media: "(prefers-color-scheme: dark)", color: "#1c2622" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SmoothScroll>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
        >
          Skip to Content
        </a>
        <header className="glass sticky top-0 z-20 flex items-center justify-between gap-4 px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
          <Link href="/" translate="no" className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
            >
              H
            </span>
            <span className="truncate">HackUMass</span>
          </Link>
          <Link href="/" className="shrink-0 text-sm font-medium underline-offset-4 hover:underline">
            Switch Role
          </Link>
        </header>
        <main id="main" tabIndex={-1} className="flex flex-1 flex-col">
          {children}
        </main>
        </SmoothScroll>
      </body>
    </html>
  );
}
