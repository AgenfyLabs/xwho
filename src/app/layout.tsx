import type { Metadata } from "next";
import { Footer, Header } from "@/components/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "XWho · 中文 X 黄皮书", template: "%s · XWho" },
  description: "按赛道查找中文 X 创作者的可核验作品，阅读附原始出处的每日动态。",
};
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><a className="skip" href="#main">跳至正文</a>
    <Header /><main id="main" className="shell">{children}</main><Footer />
  </body></html>;
}
