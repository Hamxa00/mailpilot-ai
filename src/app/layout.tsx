import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MailPilot AI",
  description:
    "A minimalist email client powered by AI. Focus on what matters. Let AI handle the rest.",
  openGraph: {
    title: "MailPilot AI",
    description: "A minimalist email client powered by AI.",
    images: [
      {
        url: "/next.svg",
        width: 64,
        height: 64,
        alt: "MailPilot AI Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "MailPilot AI",
    description: "A minimalist email client powered by AI.",
    images: ["/next.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
