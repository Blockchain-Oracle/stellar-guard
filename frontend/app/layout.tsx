import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StellarGuard - Advanced Stop-Loss Orders",
  description: "Professional trading tools for Stellar DEX with trailing stop-loss, take-profit, and OCO orders powered by Reflector oracles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}