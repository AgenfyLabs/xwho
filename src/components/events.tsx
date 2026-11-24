"use client";

import { useState } from "react";
import Link from "next/link";
import { Clipboard, ExternalLink } from "lucide-react";
import { formatDraft, groupEvents, type DigestEntry } from "@/lib/digest";
import { eventNames, eventTypes, verticalNames, verticals, type EventType, type Vertical } from "@/lib/schema";
import { Empty } from "./empty";

function CopyDraft({ day, events }: { day: string; events: DigestEntry[] }) {
  const [state, setState] = useState<"ready" | "done" | "manual">("ready");
  const draft = formatDraft(day, events);
  async function copy() {
    try { await navigator.clipboard.writeText(draft); setState("done"); }
    catch { setState("manual"); }
  }
  return <div className="copy-draft"><button className="btn small" onClick={copy}><Clipboard size={14} />
    {state === "done" ? "已复制草稿" : "复制今日推文草稿"}</button>
    {state === "manual" && <label>请选中并复制草稿<textarea aria-label="推文草稿" readOnly value={draft} onFocus={e => e.target.select()} /></label>}</div>;
}
export function Events({ entries }: { entries: DigestEntry[] }) {
  const [vertical, setVertical] = useState<Vertical | "">("");
  const [type, setType] = useState<EventType | "">("");
  const groups = groupEvents(entries, vertical || undefined, type || undefined);
  return <>
    <div className="event-filters"><label>主赛道<select value={vertical} onChange={e => setVertical(e.target.value as Vertical | "")}>
      <option value="">全部赛道</option>{verticals.map(v => <option key={v} value={v}>{verticalNames[v]}</option>)}</select></label>
      <label>事件类型<select value={type} onChange={e => setType(e.target.value as EventType | "")}><option value="">全部事件</option>
        {eventTypes.map(t => <option key={t} value={t}>{eventNames[t]}</option>)}</select></label></div>
    {groups.length ? groups.map(({ day, events }, index) => <section className={`event-day ${index === 0 ? "latest" : ""}`} key={day}>
      <div className="section-head"><h2><time dateTime={day}>{day}</time>{index === 0 && <small>最近一期</small>}</h2>
        <CopyDraft key={events.map(e => e.id).join(",")} day={day} events={events} /></div>
      <ul className="entries">{events.map(e => <li key={e.id}><span className="badge">{eventNames[e.event_type]}</span> <Link href={`/creator/${e.handle}`}>{e.display_name} <span className="handle">@{e.handle}</span></Link>
        <p>{e.summary}</p><a className="text-link" href={e.source_url}>原始出处 <ExternalLink size={13} /></a></li>)}</ul>
    </section>) : <Empty kind="calendar" title={entries.length ? "没有匹配的事件" : "首期大事件待收录"}>
      {entries.length ? "可以切换赛道或事件类型，查看其他动态。" : "经核验的产品发布、开源进展与创作动态将在此按日更新，每条都附原始出处。"}</Empty>}
  </>;
}
