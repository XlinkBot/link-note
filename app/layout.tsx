import './globals.css'
import { FileProvider } from '@/contexts/FileContext'
import { IndexProvider } from '@/contexts/IndexContext'
import localFont from "next/font/local";
import type { Metadata } from "next";
import Link from "next/link";

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white h-screen flex flex-col`}>
        <header className="flex-none h-14 bg-white border-b">
          <div className="max-w-screen-2xl mx-auto px-4 h-full flex items-center justify-between">
            <Link 
              href="https://www.xlink.bot/products/link-note" 
              className="flex items-center gap-2 text-[#117554] hover:text-[#0D5940] transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="text-xl font-bold">Link-Note</span>
              <span className="text-sm text-gray-500 font-normal">
                AI powered document editor
              </span>
            </Link>
          </div>
        </header>
        
        <main className="flex-1 overflow-hidden">
          <FileProvider>
            <IndexProvider>
              {children}
            </IndexProvider>
          </FileProvider>
        </main>
      </body>
    </html>
  )
}
