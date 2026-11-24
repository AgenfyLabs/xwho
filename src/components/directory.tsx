"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Check, Search } from "lucide-react";
import type { DirectoryResult } from "@/lib/data";
import { displayTime } from "@/lib/digest";
import { roleNames, roles, tierNames, verticalNames, verticals } from "@/lib/schema";
import { Empty } from "./empty";

const defaults = { q: "", vertical: "", role: "", cooperation: "", open: false, deep: false, claimedFirst: false, sort: "tier", page: 1 };
type Filters = typeof defaults;
function queryFor(filters: Filters) {
  const query = new URLSearchParams();
  for (const k of Object.keys(defaults) as (keyof Filters)[]) {
    const value = filters[k];
    if (value !== defaults[k]) query.set(k, value === true ? "1" : String(value));
  }
  return query.toString();
}
function CreatorCard({ c }: { c: DirectoryResult["items"][number] }) {
  return <article className="creator-card">
    <div className="badges"><span className="badge">{tierNames[c.verification_tier]}</span><span>{verticalNames[c.vertical]}</span></div>
    <h3><Link href={`/creator/${c.handle}`}>{c.display_name}</Link></h3><span className="handle">@{c.handle}</span>
    <p>{c.summary}</p>
    <div className="tags">{[...c.role_tags.map(t => roleNames[t]), ...c.sub_tags].map((s, i) => <span key={i}>{s}</span>)}</div>
    {c.works.map((w, i) => <a className="work-link" key={i} href={w.url}><BookOpen size={14} />{w.title}</a>)}
    {c.followers_snapshot && <small>粉丝 {c.followers_snapshot.count.toLocaleString("zh-CN")} · {displayTime(c.followers_snapshot.as_of)}</small>}
    <div className="card-status">{c.claimed ? c.open ? "已认领 · 正在接合作" : "已认领" : "未认领 · 联系方式待本人填写"}</div>
  </article>;
}
export function Directory({ initial }: { initial: DirectoryResult }) {
  const [filters, setFilters] = useState<Filters>(defaults);
  const [result, setResult] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const query = queryFor(filters);
  function change<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(f => ({ ...f, page: 1, [key]: value }));
  }
  useEffect(() => {
    if (!query) { setResult(initial); setLoading(false); setError(""); return; }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/directory?${query}`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const next: DirectoryResult = await response.json();
        if (!controller.signal.aborted) setResult(next);
      } catch {
        if (!controller.signal.aborted) setError("名录暂时无法加载。");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 130);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, initial, retry]);
  return <section className="directory" aria-labelledby="directory-title">
    <div className="section-head"><h2 id="directory-title">创作者名录</h2><span className="folio">共 {initial.counts.all} 人</span></div>
    <div className="tabs" aria-label="按赛道筛选">
      {(["", ...verticals] as const).map(v => <button key={v} aria-pressed={filters.vertical === v} onClick={() => change("vertical", v)}>
        {v ? verticalNames[v] : "全部"}<span>{v ? initial.counts[v] : initial.counts.all}</span></button>)}</div>
    <div className="filters"><label className="search"><Search aria-hidden="true" size={18} />
      <input type="search" aria-label="搜索创作者" placeholder="搜索名称、@用户名、作品或关键词" value={filters.q} onChange={e => change("q", e.target.value)} /></label>
      <label><span className="sr-only">身份背景</span><select value={filters.role} onChange={e => change("role", e.target.value)}>
        <option value="">全部身份背景</option>{roles.map(t => <option key={t} value={t}>{roleNames[t]}</option>)}</select></label>
      <label><span className="sr-only">合作标签</span><select value={filters.cooperation} onChange={e => change("cooperation", e.target.value)}>
        <option value="">全部合作标签</option>{initial.cooperationTags.map(t => <option key={t}>{t}</option>)}</select></label>
    </div>
    <div className="filter-row"><div className="switches">
      {([["claimedFirst", "已认领优先"], ["open", "正在接合作"], ["deep", "只看深度核验"]] as const).map(([key, name]) =>
        <label key={key} className="check"><input type="checkbox" checked={filters[key]} onChange={e => change(key, e.target.checked)} />
          <span aria-hidden="true"><Check size={12} /></span>{name}</label>)}</div>
      <label className="sort-label">排序<select value={filters.sort} onChange={e => change("sort", e.target.value)}>
        <option value="tier">深度核验优先</option><option value="followers">粉丝从高到低</option><option value="active">最近活跃</option></select></label>
    </div>
    <div aria-busy={loading} aria-live="polite">
      {error ? <div className="notice">{error} <button className="text-link" onClick={() => setRetry(n => n + 1)}>重试</button></div>
        : result.items.length ? <div className="card-grid">{result.items.map(c => <CreatorCard key={c.x_user_id} c={c} />)}</div>
        : initial.counts.all ? <Empty kind="search" title="没有匹配的创作者">试试其他关键词，或<button className="text-link" onClick={() => setFilters(defaults)}>清除筛选</button>。</Empty>
        : <Empty title="首批创作者档案待入库">已核验的档案将在这里按赛道展出。创作者可前往<Link className="text-link" href="/dashboard">本人工作台</Link>申请入库。</Empty>}
    </div>
    <div className="pagination"><span>{loading ? "正在筛选…" : `显示 ${result.offset ? `${result.offset + 1}–` : ""}${result.offset + result.items.length} / ${result.total} 人`}</span>
      {result.pages > 1 && <div className="actions"><button className="btn small" disabled={loading || result.page <= 1} onClick={() => change("page", result.page - 1)}>上一页</button>
        <button className="btn small" disabled={loading || result.page >= result.pages} onClick={() => change("page", result.page + 1)}>下一页</button></div>}</div>
  </section>;
}
