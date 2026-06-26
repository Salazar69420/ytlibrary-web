import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brain Builder · YT Library",
  description: "Your personal YouTube video library with AI brain export",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
