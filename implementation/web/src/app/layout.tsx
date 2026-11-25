import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulsePass — Live Events, Venues & Demo Ticketing",
  description:
    "Independent event discovery, venue guide, sales timeline, and demo ticket reservation platform."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f6f7fb] text-[#111319] antialiased">
        {children}
      </body>
    </html>
  );
}
