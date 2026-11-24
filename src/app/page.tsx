import Link from "next/link";
import { CalendarDays, UserRound } from "lucide-react";
import { Directory } from "@/components/directory";
import { directory, readDataset } from "@/lib/data";

export default function Home() {
  return <>
    <section className="hero">
      <div className="hero-copy"><h1>中文 <i>X</i> 黄皮书</h1>
        <p>从公开作品认识中文 X 创作者，按赛道查阅可核验的档案与每日动态。</p>
        <div className="actions"><Link href="/dashboard" className="btn primary"><UserRound />认领或申请入库</Link>
          <Link href="/events" className="btn"><CalendarDays />看中推今日大事件</Link></div>
      </div>
      <div className="book-art" aria-hidden="true"><div className="book-pages" /><div className="book-cover">
        <span className="book-word">XWho</span><span className="book-title">中文 X 黄皮书</span>
        <span className="book-rule" /><span className="book-imprint">创作者名录</span>
        <span className="index-tabs"><b /><b /><b /></span>
      </div></div>
    </section>
    <Directory initial={directory(readDataset().creators)} />
  </>;
}
