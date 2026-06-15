import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prayer Tracking",
  description: "Prayer tracking for children, mosque classes, madrasahs, families, and community organisations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  );
}
