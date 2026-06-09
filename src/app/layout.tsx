import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Gen Platform",
  description: "Self-hosted dynamic image generation (Placid alternative)",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
