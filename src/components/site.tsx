"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, ExternalLink } from "lucide-react";

export function Header() {
  const path = usePathname();
  return <header className="site-header"><div className="shell header-inner">
    <Link href="/" className="brand" aria-label="XWho 首页"><BookOpenText aria-hidden="true" />XWho</Link>
    <nav className="main-nav" aria-label="主导航">
      {[["/", "创作者名录"], ["/rankings", "排行榜"], ["/events", "今日大事件"], ["/dashboard", "我的名片"]].map(([href, label]) =>
        <Link key={href} href={href} aria-current={(href === "/" ? path === "/" || path.startsWith("/creator/") : href === "/rankings" ? path === href || path.startsWith("/rankings/") : path === href) ? "page" : undefined}>{label}</Link>)}
    </nav>
    <a className="github-nav" href="https://github.com/AgenfyLabs/xwho">GitHub <ExternalLink size={14} aria-hidden="true" /></a>
  </div></header>;
}
export function Footer() {
  return <footer className="shell site-footer"><span><strong>XWho</strong> 中文 X 黄皮书</span>
    <a href="https://github.com/AgenfyLabs/xwho">开源仓库 <ExternalLink size={13} aria-hidden="true" /></a></footer>;
}
