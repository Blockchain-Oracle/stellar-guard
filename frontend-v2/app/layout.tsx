import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Header from "@/components/header"
import { Web3Background } from "@/components/web3-background"
import { Providers } from "@/components/providers"
import { Toaster } from "react-hot-toast"

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  fallback: ['system-ui', 'arial']
})

export const metadata: Metadata = {
  title: "StellarGuard - Advanced Trading Protection Protocol",
  description: "Protect your positions with automated stop-loss orders, liquidation monitoring, and portfolio rebalancing on Stellar blockchain.",
  keywords: ["Stellar", "Trading", "Stop-Loss", "DeFi", "Web3", "Cryptocurrency", "Portfolio Management"],
  authors: [{ name: "StellarGuard Team" }],
  creator: "StellarGuard",
  publisher: "StellarGuard",
  robots: "index, follow",
  openGraph: {
    title: "StellarGuard - Advanced Trading Protection Protocol",
    description: "Advanced trading protection and portfolio management on Stellar blockchain",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "StellarGuard - Advanced Trading Protection Protocol",
    description: "Advanced trading protection and portfolio management on Stellar blockchain",
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <Web3Background />
            <div className="relative z-10 min-h-screen flex flex-col">
              <Header />
              <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
            </div>
            <Toaster 
              position="bottom-right"
              toastOptions={{
                className: 'font-mono',
                style: {
                  background: '#1a1a1a',
                  color: '#fff',
                  border: '1px solid rgba(255, 107, 53, 0.3)',
                  boxShadow: '0 0 20px rgba(255, 107, 53, 0.2)',
                },
              }}
            />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}



