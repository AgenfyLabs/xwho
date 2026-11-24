"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApplicationInputSchema, ProfileInputSchema, type Identity, type ProfileInput } from "@/lib/identity";
import { applicationInput, pendingApplicationKey, takeApplication, withSuggestions } from "@/lib/application-form";
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
function Feedback({ state, repo }: { state: ReturnType<typeof useChange>; repo: string }) {
  const r = state.receipt;
  return <div aria-live="polite">{state.error && <p className="notice error" role="alert">{state.error}</p>}
    {r && <div className="notice">{r.mode === "preview" ? <><Preview document={r.document} />
      <a className="text-link" href={repo}>在 GitHub 上提交资料</a></> : r.mode === "unchanged" ? "这份资料已经是最新版了。"
      : <><p>{r.mode === "pr" ? "已提交，等编辑核对后就会更新到黄皮书。" : "已保存，名片将在网站更新后显示。"}</p>
        <a className="text-link" href={r.url}>{r.mode === "pr" ? "查看审核进度" : "查看修改记录"}</a></>}</div>}
  </div>;
}
function VerticalSelect({ value, set }: { value: Vertical | ""; set: (v: Vertical) => void }) {
  return <label>主赛道<select required value={value} onChange={e => set(e.target.value as Vertical)}>
    <option value="" disabled>选择主赛道</option>{verticals.map(v => <option key={v} value={v}>{verticalNames[v]}</option>)}</select></label>;
}
type ApplicationFormProps = {
  previewOnly: boolean; repo: string; ownerId?: string; suggestions?: XApplication;
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
export function ApplicationForm({ previewOnly, repo, ownerId, suggestions, canWrite = false, attempt, authFailed }: ApplicationFormProps) {
  const [fields, setFields] = useState(() => withSuggestions(undefined, suggestions));
  const state = useChange();
  const { send, setError } = state;
  const endpoint = canWrite ? "/api/apply" : "/api/apply?preview=1";

  useEffect(() => {
    if (!attempt && !authFailed) return;
    let saved;
    try {
      saved = takeApplication(sessionStorage, attempt, ownerId);
    } catch { return; }
    if (!saved) return;
    const merged = withSuggestions(saved.fields, authFailed ? undefined : suggestions);
    setFields(merged);
    if (!attempt || authFailed || !suggestions) return;
    const result = applicationInput(merged);
    if (result.success) {
      void send(saved.preview ? "/api/apply?preview=1" : endpoint, result.data);
    } else {
      setError(applicationError(result.error));
    }
  }, [attempt, ownerId, authFailed, suggestions, endpoint, send, setError]);

  function syncAndApply() {
    if (!ownerId) return;
    try {
      const attempt = crypto.randomUUID();
      sessionStorage.setItem(pendingApplicationKey, JSON.stringify({ id: ownerId, fields, attempt, expires: Date.now() + 600_000, preview: !canWrite }));
      window.location.assign(`/api/auth/x/login?application=${attempt}`);
    } catch { setError("浏览器无法暂存申请。可继续手动填写，或重新使用 X 登录以载入简介。"); }
  }
  function submit(e: FormEvent) {
    e.preventDefault(); state.setError(""); state.setReceipt(null);
    const result = applicationInput(fields);
    if (!result.success) { state.setError(applicationError(result.error)); return; }
    if (previewOnly) state.setReceipt({ mode: "preview", path: "入库申请草稿 · 登录后绑定本人 X ID", document: result.data });
    else void send(endpoint, result.data);
  }
  return <section className="chapter"><h2>{previewOnly ? "预览加入申请" : "加入黄皮书"}</h2>
    <p id="application-mode" className="muted">{canWrite ? "提交后，申请会公开在 GitHub 上。编辑核对作品后，你的名片就会出现在黄皮书里。"
      : "先写几句介绍，再贴上你想分享的作品链接，就能预览申请。"}</p>
    {ownerId && !suggestions && <div className="login-box"><p>用公开的 X 简介和置顶帖补全申请。资料齐全时，点下面的按钮会{canWrite ? "直接提交给编辑" : "生成预览"}。</p>
      <button type="button" className="btn" disabled={state.busy} onClick={syncAndApply}>{canWrite ? "用 X 简介自动申请" : "用 X 简介自动预览"}</button></div>}
    {suggestions && <p className="muted">{suggestions.summary ? "已带入你的 X 简介，可以改成你喜欢的说法。" : "用一句话介绍你在做什么。"}{suggestions.pinnedPost ? "作品链接用了你的置顶帖，也可以换一件。" : "再选一件自己的作品，贴上链接。"}</p>}
    <form className="editor" onSubmit={submit}><VerticalSelect value={fields.vertical} set={vertical => setFields(f => ({ ...f, vertical }))} />
      <label>一句话简介<textarea required value={fields.summary} onChange={e => setFields({ ...fields, summary: e.target.value })} /></label>
      <label>公开作品链接<small>至少贴一个大家能打开的链接，比如一篇文章或一个项目。多个链接请分行填写。</small><textarea required value={fields.works} onChange={e => setFields({ ...fields, works: e.target.value })} /></label>
      <div className="actions">
        {!canWrite && <button type="submit" className={previewOnly ? "btn primary" : "btn"} disabled={state.busy}>{state.busy ? "正在预览…" : "预览申请"}</button>}
        {!previewOnly && <button type="submit" className="btn primary" aria-describedby="application-mode" disabled={!canWrite || state.busy}>{canWrite && state.busy ? "正在提交…" : "提交申请"}</button>}
      </div>
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
  if (c.claim_status === "hidden") return <section className="chapter"><h2>你的名片已隐藏</h2><p>恢复后，大家会重新看到你的名片和之前保留的合作信息。</p>
    <button className="btn primary" disabled={state.busy} onClick={() => send({ action: "restore" })}>恢复我的名片</button><Feedback state={state} repo={repo} /></section>;
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
      </fieldset><button className="btn primary" disabled={state.busy}>{state.busy ? "正在提交…" : c.claim_status === "unclaimed" ? "认领并保存" : "保存名片"}</button>
    </form>
    <div className="hide-panel"><h3>隐藏名片</h3><p>隐藏生效后，名片和相关动态会从黄皮书上移除。以后可以回来恢复。</p>
      <button className="btn danger" disabled={state.busy} onClick={() => send({ action: "hide" })}>隐藏我的名片</button></div>
    <Feedback state={state} repo={repo} /></section>;
}
export function SignedIn({ owner }: { owner: Identity }) {
  return <div className="account-row"><span>{owner.name} <strong>@{owner.username}</strong></span>
    <form method="post" action="/api/auth/logout"><button className="btn small">退出登录</button></form></div>;
}
