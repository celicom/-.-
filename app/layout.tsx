import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DemoSwitcher } from "@/components/DemoSwitcher";
import { PricingProvider } from "@/components/PricingProvider";
import { CookieBanner } from "@/components/CookieBanner";
import { Analytics } from "@/components/Analytics";

export const metadata: Metadata = {
  title: "Сосед.ру — сервис для дома в вашем ЖК",
  description: "Гиперлокальный агрегатор бытовых услуг: ремонт техники, уборка и клуб соседей в рамках ЖК.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Сосед.ру", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-canvas font-sans antialiased">
        <PricingProvider>
          <DemoSwitcher />
          <div className="pt-11">{children}</div>
          <CookieBanner />
          <Analytics />
        </PricingProvider>
      </body>
    </html>
  );
}
