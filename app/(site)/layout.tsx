import { SiteHeader } from "@/components/site/SiteChrome";
import { SiteFooter } from "@/components/site/SiteParts";
import { ChatBot } from "@/src/components/ChatBot";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-canvas">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <ChatBot />
    </div>
  );
}
