import type { Metadata } from "next";
import Link from "next/link";
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
  title: "HackUMass",
  description: "Choose a role to continue",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <p className="text-sm font-medium">HackUMass</p>
          <Link href="/" className="text-sm font-medium underline-offset-4 hover:underline">
            Switch role
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
