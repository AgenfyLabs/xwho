import Link from "next/link";
import { BookOpen, ChevronDown } from "lucide-react";
import type { DirectoryResult } from "@/lib/data";
import { displayTime } from "@/lib/digest";
import { roleNames, tierNames, verticalNames } from "@/lib/schema";

export function CreatorCard({ c }: { c: DirectoryResult["items"][number] }) {
  const [featured, ...otherWorks] = c.works;
  const tags = [...c.role_tags.map(t => roleNames[t]), ...c.sub_tags];
  return <article className="creator-card">
    <div className="card-edition"><span>{verticalNames[c.vertical]}</span><span>{tierNames[c.verification_tier]}</span></div>
    <header className="card-name"><h3><Link href={`/creator/${c.handle}`}>{c.display_name}</Link></h3><span className="handle">@{c.handle}</span></header>
    <p className="card-summary">{c.summary}</p>
    {featured && <a className="featured-work" href={featured.url}><BookOpen size={14} aria-hidden="true" /><span>{featured.title}</span></a>}
    <details className="card-details"><summary>
      <span>{c.claimed ? c.open ? "正在接合作" : "已认领" : "未认领"}</span><span>更多资料<ChevronDown size={13} aria-hidden="true" /></span>
    </summary><div className="card-extra">
      {!c.claimed && <p>联系方式由创作者认领后填写。</p>}
      {tags.length > 0 && <div className="tags">{tags.map((tag, i) => <span key={i}>{tag}</span>)}</div>}
      {otherWorks.map((w, i) => <a className="work-link" key={i} href={w.url}>{w.title}</a>)}
      {c.followers_snapshot && <small>粉丝 {c.followers_snapshot.count.toLocaleString("zh-CN")} · {displayTime(c.followers_snapshot.as_of)}</small>}
    </div></details>
  </article>;
}
