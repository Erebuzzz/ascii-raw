import type { Metadata } from "next";
import { DotGothic16 } from "next/font/google";
import "./globals.css";

const dotFont = DotGothic16({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dot",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ASCII.RAW // CAM_01",
  description: "Live camera scan into high-performance dot matrix ASCII art",
  openGraph: {
    title: "ASCII.RAW // CAM_01",
    description: "Live camera scanning into dot matrix ASCII art",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dotFont.variable}>
      <body className="font-dot">{children}</body>
    </html>
  );
}
