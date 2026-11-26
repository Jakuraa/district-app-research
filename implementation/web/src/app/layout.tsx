import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulsePass — Live Events, Movies, Dining & Play",
  description:
    "Discover concerts, festivals, movies, dining reservations, and city activities on PulsePass."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f6f7fb] text-[#111319] antialiased selection:bg-[#efeafe] selection:text-[#5b3df5]">
        {children}
      </body>
    </html>
  );
}
