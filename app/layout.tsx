import './globals.css'
import { FileProvider } from '@/contexts/FileContext'
import { IndexProvider } from '@/contexts/IndexContext'
import localFont from "next/font/local";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "link-note",
  description: "More intelligent document editing experience",
};

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0A2337]`}>
        <FileProvider>
          <IndexProvider>
            {children}
          </IndexProvider>
        </FileProvider>
      </body>
    </html>
  )
}
