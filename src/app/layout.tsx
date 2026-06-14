import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prayer Tracker",
  description: "Track daily Islamic prayers for your children.",
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
