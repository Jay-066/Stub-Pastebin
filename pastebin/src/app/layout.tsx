import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "stub — paste & share text",
  description:
    "Paste text, get a link. Content can expire by time or by view count.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
