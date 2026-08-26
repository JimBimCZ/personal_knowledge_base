import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Personal knowledge base",
  description: "Ask questions of your own notes. Every answer cites its source.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
