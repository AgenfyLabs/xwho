import type { Metadata } from "next";
import { Footer, Header } from "@/components/site";
import { SITE_DESCRIPTION, SITE_NAME, siteOrigin } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { types: { "text/plain": "/llms.txt" } },
  openGraph: { type: "website", siteName: SITE_NAME, locale: "zh_CN" },
  twitter: { card: "summary_large_image" },
};
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><a className="skip" href="#main">跳至正文</a>
    <Header /><main id="main" className="shell">{children}</main><Footer />
  </body></html>;
}
