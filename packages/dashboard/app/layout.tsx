import { DashboardProvider } from "@/lib/data/dashboard-context";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Exo_2, Geist, Geist_Mono } from "next/font/google";
import type React from "react";
import { Toaster } from "sonner";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const exo2 = Exo_2({ subsets: ["latin"], variable: "--font-exo2" });

export const metadata: Metadata = {
  title: "CyberMem",
  description: "Real-time memory operations dashboard",
  icons: {
    icon: "/favicon-dark.svg",
    shortcut: "/favicon-dark.svg",
    apple: "/favicon-dark.svg",
  },
};

import { headers } from "next/headers";

// ... imports ...

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const initialAuth = !!userId;

  return (
    <html lang="en" suppressHydrationWarning className="relative">
      <body className={`font-sans antialiased relative z-10 ${exo2.variable}`}>
        <DashboardProvider initialAuth={initialAuth}>
          {children}
        </DashboardProvider>
        <Toaster richColors theme="dark" position="bottom-right" />
        <Analytics />
      </body>
    </html>
  );
}
