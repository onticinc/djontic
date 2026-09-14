import type { Metadata } from "next";
import { Archivo, Bebas_Neue } from "next/font/google";
import { AppShell } from "@/components/AppShell";
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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
