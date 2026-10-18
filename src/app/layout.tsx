import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Playfair_Display,
  Plus_Jakarta_Sans,
  IBM_Plex_Mono,
} from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "MAISON ARCHIVE — Sartorial Wishlist, Wardrobe & Sunburst 2.5 Studio",
  description:
    "Vintage-modern sartorial acquisition ledger, personal wardrobe archive, DeepSeek V4.1 Flash (1017) curator, KIE.AI GPT Image 2.5 Sunburst flat-lay studio, and GrokBot Railway hub.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${playfair.variable} ${jakarta.variable} ${plexMono.variable}`}
    >
      <body className="bg-parchment-50 text-espresso-900 font-sans antialiased selection:bg-brass-400/30 selection:text-espresso-950 min-h-screen relative overflow-x-hidden">
        <div className="paper-grain pointer-events-none fixed inset-0 z-50" />
        {children}
      </body>
    </html>
  );
}
