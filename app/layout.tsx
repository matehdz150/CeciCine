import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./Header";

export const metadata: Metadata = {
  title: "Ceci+",
  description: "Para ceci",
  icons: {
    icon: "/ceci.jpeg",
    shortcut: "/ceci.jpeg",
    apple: "/ceci.jpeg",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#0f0f14] text-white">
        
        {/* 🔥 HEADER GLOBAL */}
        <Header />

        {/* 🔥 CONTENT */}
        <main className="pt-15"> 
          {children}
        </main>

      </body>
    </html>
  );
}