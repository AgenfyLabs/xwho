import type { Metadata } from "next";
import { Footer, Header } from "@/components/site";
import { siteDescription, siteOrigin, siteTitle } from "@/lib/seo";
import "./globals.css";

const socialTitle = () => ({ default: siteTitle, template: "%s · XWho" });
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: socialTitle(),
  description: siteDescription,
  openGraph: { type: "website", locale: "zh_CN", siteName: "XWho", title: socialTitle(), description: siteDescription },
  twitter: { card: "summary", title: socialTitle(), description: siteDescription },
  other: { "applicable-device": "pc,mobile" },
};
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><a className="skip" href="#main">跳至正文</a>
    <Header /><main id="main" className="shell">{children}</main><Footer />
  </body></html>;
}
