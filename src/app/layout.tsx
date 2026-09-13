import type { Metadata } from "next";
import { Archivo, Bebas_Neue } from "next/font/google";
import { SiteBanner } from "@/components/SiteBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DJ Ontic | Sun Valley Idaho",
    template: "%s | DJ Ontic",
  },
  description:
    "DJ Ontic — Sun Valley, Idaho. Events in Park City, Jackson Hole, and Chelan, Washington. Mixes, weddings, and live bookings.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${bebas.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <SiteBanner />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
