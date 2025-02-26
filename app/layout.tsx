import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shadowserver API client",
  description:
    "An unofficial web client to query and display reports from Shadowserver",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
