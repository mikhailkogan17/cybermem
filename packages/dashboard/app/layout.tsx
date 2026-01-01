import { DashboardProvider } from "@/lib/data/dashboard-context"
import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from "next"
import { Exo_2, Geist, Geist_Mono } from "next/font/google"
import type React from "react"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const exo2 = Exo_2({ subsets: ["latin"], variable: "--font-exo2" })

export const metadata: Metadata = {
  title: "CyberMem",
  description: "Real-time memory operations dashboard",
  icons: {
    icon: '/favicon-dark.svg',
    shortcut: '/favicon-dark.svg',
    apple: '/favicon-dark.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="relative">
      <body className={`font-sans antialiased relative z-10 ${exo2.variable}`}>
        <DashboardProvider>
          {children}
        </DashboardProvider>
        <Analytics />
      </body>
    </html>
  )
}
