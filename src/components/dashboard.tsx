"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { applicationDocument, ApplicationInputSchema, ProfileInputSchema, publicApplicationIntent, type ApplicationInput, type Identity, type ProfileInput } from "@/lib/identity";
import { applicationInput, draftKey, emptyDraft, pendingApplicationKey, readDraft, takeApplication, withSuggestions, type ApplicationDraft, type ApplicationFields } from "@/lib/application-form";
import { CreatorSchema, validationMessage, verticalNames, verticals, type Creator, type Vertical } from "@/lib/schema";
import type { WriteResult } from "@/lib/github-writer";
import type { XApplication } from "@/lib/x-application";

function useChange() {
  const [receipt, setReceipt] = useState<WriteResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const send = useCallback(async (url: string, body: unknown) => {
    setBusy(true); setError(""); setReceipt(null);
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "提交失败，请重试");
      setReceipt(data);
    } catch (e) { setError(e instanceof Error ? e.message : "网络连接失败，请重试"); }
    finally { setBusy(false); }
  }, []);
  return { receipt, setReceipt, error, setError, busy, send };
}
function Preview({ document }: { document: unknown }) {
  const application = ApplicationInputSchema.strip().safeParse(document);
  const profile = application.success ? undefined : CreatorSchema.safeParse(document);
  return <><h3>资料预览</h3>
    {application.success && <><p>{verticalNames[application.data.vertical]} · {application.data.summary}</p>
      <ul>{application.data.work_urls.map((url, i) => <li key={i}><a className="text-link" href={url}>{url}</a></li>)}</ul></>}
    {profile?.success && <p>{profile.data.display_name} · {profile.data.summary}</p>}
    <details><summary>查看原始资料（JSON）</summary><pre>{JSON.stringify(document, null, 2)}</pre></details>
  </>;
}
function Feedback({ state }: { state: ReturnType<typeof useChange> }) {
  const r = state.receipt;
  return <div aria-live="polite">{state.error && <p className="notice error" role="alert">{state.error}</p>}
    {r && <div className="notice">{r.mode === "preview" ? <><p>目前仅供预览，这份资料尚未公开提交。</p><Preview document={r.document} /></> : r.mode === "unchanged" ? "这份资料已经是最新版了。"
      : <><p>{r.mode === "pr" ? "已提交，等编辑核对后就会更新到黄皮书。" : "已保存，名片将在网站更新后显示。"}</p>
        <a className="text-link" href={r.url}>{r.mode === "pr" ? "查看审核进度" : "查看修改记录"}</a></>}</div>}
  </div>;
}
function VerticalSelect({ value, set, disabled }: { value: Vertical | ""; set: (v: Vertical) => void; disabled?: boolean }) {
  return <label>主赛道<select required disabled={disabled} value={value} onChange={e => set(e.target.value as Vertical)}>
    <option value="" disabled>选择主赛道</option>{verticals.map(v => <option key={v} value={v}>{verticalNames[v]}</option>)}</select></label>;
}
type ApplicationFormProps = {
  owner?: Identity & { application?: XApplication };
  canWrite?: boolean; attempt?: string; authFailed?: boolean;
};
function applicationError(error: Parameters<typeof validationMessage>[0]) {
  const hints: Record<string, string> = {
    vertical: "选一下最能代表你的主赛道。",
    summary: "用一句话介绍你在做什么。",
    work_urls: "请贴一个完整的作品网址，以 https:// 或 http:// 开头，每行一个。",
  };
  return [...new Set(error.issues.map(issue => hints[String(issue.path[0])] ?? "请检查申请内容后再提交。"))].join("");
}
export function ApplicationForm({ owner, canWrite = false, attempt, authFailed }: ApplicationFormProps) {
  const [draft, setDraft] = useState(emptyDraft);
  const [review, setReview] = useState<ApplicationInput | null>(null);
  const reviewPanel = useRef<HTMLElement>(null);
  const state = useChange();
  const ownerId = owner?.id;
  const suggestions = owner?.application;
  const imported = draft.imported && Boolean(suggestions);
  const fields = withSuggestions(draft.fields, imported ? suggestions : undefined);
  const pinned = imported ? suggestions?.pinnedPost : undefined;
  const links = fields.works.split(/\r?\n/);

  useEffect(() => {
    if (!ownerId) return;
    try {
      const saved = readDraft(sessionStorage, ownerId);
      const pending = takeApplication(sessionStorage, attempt, ownerId);
      if (!pending) { setDraft(saved); return; }
      const restored = { fields: { ...pending.fields, ...saved.fields }, imported: saved.imported || (!authFailed && Boolean(suggestions)) };
      setDraft(restored);
      sessionStorage.setItem(draftKey(ownerId), JSON.stringify(restored));
    } catch { /* Manual editing remains available without browser storage. */ }
  }, [ownerId, attempt, authFailed, suggestions]);
  useEffect(() => { if (review) reviewPanel.current?.focus(); }, [review]);

  function updateDraft(next: ApplicationDraft) {
    setDraft(next); setReview(null); state.setError(""); state.setReceipt(null);
    if (ownerId) {
      try { sessionStorage.setItem(draftKey(ownerId), JSON.stringify(next)); } catch { /* Keep the in-memory draft. */ }
    }
  }
  function edit(changes: Partial<ApplicationFields>) {
    updateDraft({ ...draft, fields: { ...draft.fields, ...changes } });
  }
  function importDraft() {
    if (!ownerId) return;
    if (suggestions) { updateDraft({ ...draft, imported: true }); return; }
    try {
      const attempt = crypto.randomUUID();
      sessionStorage.setItem(pendingApplicationKey, JSON.stringify({ id: ownerId, fields: draft.fields, attempt, expires: Date.now() + 600_000 }));
      window.location.assign(`/api/auth/x/login?application=${attempt}`);
    } catch { state.setError("浏览器无法暂存草稿。你可以在下面手动填写。"); }
  }
  function previewDraft(e: FormEvent) {
    e.preventDefault(); state.setError(""); state.setReceipt(null);
    const result = applicationInput(fields);
    if (!result.success) { state.setError(applicationError(result.error)); return; }
    setReview(result.data);
  }
  function confirmPublic() {
    if (!ownerId || !canWrite || !review || state.busy) return;
    void state.send("/api/apply", { intent: publicApplicationIntent, accountId: ownerId, application: review });
  }
  return <section className="chapter"><h2>{owner ? "加入黄皮书" : "试写一张名片"}</h2>
    {owner && <><p className="muted">可以用 X 上的公开简介和置顶帖起草，也可以自己写。</p>
      <button type="button" className="btn" disabled={state.busy} onClick={importDraft}>从 X 导入草稿</button>
      <p role="status" className="muted">{imported && (suggestions?.summary || pinned
        ? "草稿已导入。简介可以改，置顶帖可以删掉或换成其他作品。" : "这次没有可导入的公开资料，可以在下面填写。")}</p></>}
    <form className="editor" onSubmit={previewDraft}><VerticalSelect disabled={state.busy} value={fields.vertical} set={vertical => edit({ vertical })} />
      <div className="draft-field"><label htmlFor="application-summary">一句话简介</label>
        <textarea id="application-summary" required disabled={state.busy} value={fields.summary} onChange={e => edit({ summary: e.target.value })} /></div>
      <div className="draft-field"><label htmlFor="application-works">公开作品链接</label>
        <small id="works-hint">至少选一件自己的作品。可以粘贴文章、帖子或项目的网址，每行一个。</small>
        <textarea id="application-works" aria-describedby="works-hint" required disabled={state.busy} value={fields.works} onChange={e => edit({ works: e.target.value })} /></div>
      {pinned && links.some(link => link.trim() === pinned) && <button type="button" className="text-link" disabled={state.busy}
        onClick={() => edit({ works: links.filter(link => link.trim() !== pinned).join("\n") })}>移除置顶帖</button>}
      <button type="submit" className="btn primary" disabled={state.busy}>预览草稿</button>
    </form>
    {review && !state.receipt && <section className="notice" tabIndex={-1} ref={reviewPanel} aria-label="草稿预览">
      {owner && <p>{owner.name} <strong>@{owner.username}</strong></p>}
      <Preview document={owner ? applicationDocument(owner, review) : review} />
      {owner && canWrite ? <><p id="application-public">确认后，你的 X 账号、简介和作品链接会公开在 GitHub 审核页。编辑核对后收录。</p>
        <button type="button" className="btn primary" disabled={state.busy} aria-describedby="application-public"
          onClick={confirmPublic}>{state.busy ? "正在提交…" : "确认公开提交"}</button></> : <p>这份草稿仅供预览。</p>}
    </section>}
    <Feedback state={state} /></section>;
}
export function ProfileForm({ c, canWrite }: { c: Creator; canWrite: boolean }) {
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
  if (c.claim_status === "hidden") return <section className="chapter"><h2>你的名片已隐藏</h2><p>恢复后，大家会重新看到你的名片和之前保留的合作信息。</p>
    <button className="btn primary" disabled={state.busy} onClick={() => send({ action: "restore" })}>{canWrite ? "恢复我的名片" : "预览恢复效果"}</button><Feedback state={state} /></section>;
  return <section className="chapter"><h2>{c.claim_status === "unclaimed" ? "认领这张名片" : "编辑我的名片"}</h2>
    <form className="editor" onSubmit={save}><label>公开显示名<input required value={name} onChange={e => setName(e.target.value)} /></label>
      <VerticalSelect value={vertical} set={setVertical} /><label>公开简介<textarea required value={summary} onChange={e => setSummary(e.target.value)} /></label>
      <fieldset><legend>合作与联系</legend><p className="muted">你提交的合作信息会公开在 GitHub 上，修改后仍能查到旧版本。请只留下你愿意公开的内容。</p>
        <label className="inline-check"><input type="checkbox" checked={publishBoard} onChange={e => setPublishBoard(e.target.checked)} />公开合作留言板</label>
        {publishBoard && <><label className="inline-check"><input type="checkbox" checked={open} onChange={e => setOpen(e.target.checked)} />正在接合作</label>
          <label>合作标签<small>用顿号分隔</small><input value={tags} onChange={e => setTags(e.target.value)} /></label>
          <label>合作说明（最多 280 字）<textarea value={pitch} onChange={e => setPitch(e.target.value)} /></label>
          {contacts.map((ch, i) => <div key={i} className="contact-row">{(["label", "value"] as const).map(key => <label key={key}>{key === "label" ? "联系方式名称" : "公开联系方式"}
            <input required value={ch[key]} onChange={e => setContacts(rows => rows.map((r, j) => j === i ? { ...r, [key]: e.target.value } : r))} /></label>)}
            <button type="button" className="text-link" onClick={() => setContacts(rows => rows.filter((_, j) => j !== i))}>移除</button></div>)}
          <button className="btn small" type="button" onClick={() => setContacts(rows => [...rows, { label: "", value: "" }])}>添加联系方式</button></>}
      </fieldset><button className="btn primary" disabled={state.busy}>{!canWrite ? "预览名片修改" : state.busy ? "正在提交…" : c.claim_status === "unclaimed" ? "认领并保存" : "保存名片"}</button>
    </form>
    <div className="hide-panel"><h3>隐藏名片</h3><p>隐藏生效后，名片和相关动态会从黄皮书上移除。以后可以回来恢复。</p>
      <button className="btn danger" disabled={state.busy} onClick={() => send({ action: "hide" })}>{canWrite ? "隐藏我的名片" : "预览隐藏效果"}</button></div>
    <Feedback state={state} /></section>;
}
export function SignedIn({ owner }: { owner: Identity }) {
  function clearDraft() {
    try { sessionStorage.removeItem(draftKey(owner.id)); sessionStorage.removeItem(pendingApplicationKey); } catch { /* Logout still completes. */ }
  }
  return <div className="account-row"><span>{owner.name} <strong>@{owner.username}</strong></span>
    <form method="post" action="/api/auth/logout" onSubmit={clearDraft}><button className="btn small">退出登录</button></form></div>;
}
