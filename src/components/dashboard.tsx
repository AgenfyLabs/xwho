"use client";

import { useState, type FormEvent } from "react";
import { ApplicationInputSchema, ProfileInputSchema, type Identity, type ProfileInput } from "@/lib/identity";
import { validationMessage, verticalNames, verticals, type Creator, type Vertical } from "@/lib/schema";
import type { WriteResult } from "@/lib/github-writer";

function useChange() {
  const [receipt, setReceipt] = useState<WriteResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(url: string, body: unknown) {
    setBusy(true); setError(""); setReceipt(null);
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "提交失败，请重试");
      setReceipt(data);
    } catch (e) { setError(e instanceof Error ? e.message : "网络连接失败，请重试"); }
    finally { setBusy(false); }
  }
  return { receipt, setReceipt, error, setError, busy, send };
}
function Feedback({ state, repo }: { state: ReturnType<typeof useChange>; repo: string }) {
  const r = state.receipt;
  return <div aria-live="polite">{state.error && <p className="notice error" role="alert">{state.error}</p>}
    {r && <div className="notice">{r.mode === "preview" ? <><h3>JSON 补丁预览</h3><p>{r.path}</p><pre>{JSON.stringify(r.document, null, 2)}</pre>
      <a className="text-link" href={repo}>前往 GitHub 提 PR</a></> : r.mode === "unchanged" ? "仓库已经包含这份变更。"
      : <><p>{r.mode === "pr" ? "变更已提交审核。PR 合并并部署后，公开页面将更新。" : "变更已提交至主分支。部署完成后，公开页面将更新。"}</p>
        <a className="text-link" href={r.url}>{r.mode === "pr" ? "查看 Pull Request" : "查看提交"}</a></>}</div>}
  </div>;
}
function VerticalSelect({ value, set }: { value: Vertical | ""; set: (v: Vertical) => void }) {
  return <label>主赛道<select required value={value} onChange={e => set(e.target.value as Vertical)}>
    <option value="" disabled>选择主赛道</option>{verticals.map(v => <option key={v} value={v}>{verticalNames[v]}</option>)}</select></label>;
}
export function ApplicationForm({ previewOnly, repo }: { previewOnly: boolean; repo: string }) {
  const [vertical, setVertical] = useState<Vertical | "">("");
  const [summary, setSummary] = useState("");
  const [works, setWorks] = useState("");
  const state = useChange();
  function submit(e: FormEvent) {
    e.preventDefault(); state.setError(""); state.setReceipt(null);
    const result = ApplicationInputSchema.safeParse({ vertical, summary, work_urls: works.split(/\r?\n/).map(s => s.trim()).filter(Boolean) });
    if (!result.success) { state.setError(validationMessage(result.error)); return; }
    if (previewOnly) state.setReceipt({ mode: "preview", path: "入库申请草稿 · 登录后绑定本人 X ID", document: result.data });
    else void state.send("/api/apply", result.data);
  }
  return <section className="chapter"><h2>{previewOnly ? "预览入库申请" : "申请入库"}</h2>
    <p className="muted">{previewOnly ? "在本地填写并预览申请内容。" : "提交后由编辑核对账号、作品和原始出处。"}</p>
    <form className="editor" onSubmit={submit}><VerticalSelect value={vertical} set={setVertical} />
      <label>一句话简介<textarea required value={summary} onChange={e => setSummary(e.target.value)} /></label>
      <label>公开作品链接<small>至少一个 HTTP(S) 链接，每行一项。</small><textarea required value={works} onChange={e => setWorks(e.target.value)} /></label>
      <button className="btn primary" disabled={state.busy}>{previewOnly ? "预览 JSON 补丁" : state.busy ? "正在提交…" : "提交入库申请"}</button>
    </form><Feedback state={state} repo={repo} /></section>;
}
export function ProfileForm({ c, repo }: { c: Creator; repo: string }) {
  const state = useChange();
  const board = c.service_board;
  const [name, setName] = useState(c.display_name);
  const [summary, setSummary] = useState(c.summary);
  const [vertical, setVertical] = useState(c.vertical);
  const [publishBoard, setPublishBoard] = useState(Boolean(board));
  const [open, setOpen] = useState(board?.open_for_collab ?? false);
  const [tags, setTags] = useState(board?.cooperation_tags.join("、") ?? "");
  const [pitch, setPitch] = useState(board?.pitch ?? "");
  const [contacts, setContacts] = useState(board?.contact_channels ?? []);
  function send(input: ProfileInput) {
    state.setReceipt(null); state.setError("");
    const result = ProfileInputSchema.safeParse(input);
    if (!result.success) { state.setError(validationMessage(result.error)); return; }
    void state.send("/api/profile", result.data);
  }
  function save(e: FormEvent) {
    e.preventDefault();
    send({ action: "save", display_name: name, summary, vertical, service_board: publishBoard ? {
      open_for_collab: open, cooperation_tags: tags.split(/[、,\n]/).map(s => s.trim()).filter(Boolean), pitch, contact_channels: contacts,
    } : null });
  }
  if (c.claim_status === "hidden") return <section className="chapter"><h2>我的档案已隐藏</h2><p>恢复后，档案及本人保留的合作信息将重新公开。</p>
    <button className="btn primary" disabled={state.busy} onClick={() => send({ action: "restore" })}>恢复我的档案</button><Feedback state={state} repo={repo} /></section>;
  return <section className="chapter"><h2>{c.claim_status === "unclaimed" ? "认领我的档案" : "维护我的档案"}</h2>
    <form className="editor" onSubmit={save}><label>公开显示名<input required value={name} onChange={e => setName(e.target.value)} /></label>
      <VerticalSelect value={vertical} set={setVertical} /><label>公开简介<textarea required value={summary} onChange={e => setSummary(e.target.value)} /></label>
      <fieldset><legend>本人合作留言板</legend><p className="muted">所填信息将写入公开 Git 仓库。请只填写愿意公开并保留在版本历史中的内容。</p>
        <label className="inline-check"><input type="checkbox" checked={publishBoard} onChange={e => setPublishBoard(e.target.checked)} />公开合作留言板</label>
        {publishBoard && <><label className="inline-check"><input type="checkbox" checked={open} onChange={e => setOpen(e.target.checked)} />正在接合作</label>
          <label>合作标签<small>用顿号分隔</small><input value={tags} onChange={e => setTags(e.target.value)} /></label>
          <label>合作说明（最多 280 字）<textarea value={pitch} onChange={e => setPitch(e.target.value)} /></label>
          {contacts.map((ch, i) => <div key={i} className="contact-row">{(["label", "value"] as const).map(key => <label key={key}>{key === "label" ? "联系方式名称" : "公开联系方式"}
            <input required value={ch[key]} onChange={e => setContacts(rows => rows.map((r, j) => j === i ? { ...r, [key]: e.target.value } : r))} /></label>)}
            <button type="button" className="text-link" onClick={() => setContacts(rows => rows.filter((_, j) => j !== i))}>移除</button></div>)}
          <button className="btn small" type="button" onClick={() => setContacts(rows => [...rows, { label: "", value: "" }])}>添加联系方式</button></>}
      </fieldset><button className="btn primary" disabled={state.busy}>{state.busy ? "正在提交…" : c.claim_status === "unclaimed" ? "认领并保存" : "保存档案变更"}</button>
    </form>
    <div className="hide-panel"><h3>档案可见性</h3><p>隐藏生效后，名录、搜索、事件与详情页都会移除这份档案。可再次登录恢复。</p>
      <button className="btn danger" disabled={state.busy} onClick={() => send({ action: "hide" })}>一键隐藏我的档案</button></div>
    <Feedback state={state} repo={repo} /></section>;
}
export function SignedIn({ owner }: { owner: Identity }) {
  return <div className="account-row"><span>{owner.name} <strong>@{owner.username}</strong></span>
    <form method="post" action="/api/auth/logout"><button className="btn small">退出登录</button></form></div>;
}
