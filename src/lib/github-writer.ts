import { ChangeError, applicationDocument, editProfile, type ApplicationInput, type Identity, type ProfileInput } from "./identity";
import { CreatorSchema, IdSchema, type Creator } from "./schema";

type Change = { kind: "profile"; input: ProfileInput } | { kind: "application"; input: ApplicationInput };
export type WriteResult =
  | { mode: "preview"; path: string; document: unknown }
  | { mode: "pr" | "direct"; url: string }
  | { mode: "unchanged" };

type ContentFile = { sha: string; encoding: "base64"; content: string };
type Ref = { object: { sha: string } };
class ApiError extends Error {
  constructor(public status: number) { super(`GitHub HTTP ${status}`); }
}
function repoConfig() {
  const owner = process.env.GITHUB_REPO_OWNER || "AgenfyLabs";
  const name = process.env.GITHUB_REPO_NAME || "xwho";
  return { owner, name, base: process.env.GITHUB_BASE_BRANCH || "main" };
}
export function repoUrl() {
  const { owner, name } = repoConfig();
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}
export function githubWriteMode(): "preview" | "pr" | "direct" {
  const mode = process.env.GITHUB_WRITE_MODE;
  return process.env.GITHUB_TOKEN?.trim() && (mode === "pr" || mode === "direct") ? mode : "preview";
}
async function api<T>(route: string, method = "GET", body?: unknown): Promise<T> {
  const { owner, name } = repoConfig();
  const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}${route}`, {
    method, cache: "no-store", headers: {
      Accept: "application/vnd.github+json", Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json", "User-Agent": "XWho", "X-GitHub-Api-Version": "2022-11-28",
    }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status);
  return res.json() as Promise<T>;
}
async function optional<T>(get: Promise<T>): Promise<T | null> {
  try { return await get; } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
const readRef = (branch: string) => api<Ref>(`/git/ref/heads/${branch.split("/").map(encodeURIComponent).join("/")}`);
const readFile = (path: string, ref: string) => optional(api<ContentFile>(`/contents/${path}?ref=${encodeURIComponent(ref)}`));
function decode(file: ContentFile) {
  if (file.encoding !== "base64") throw new ChangeError(502, "GitHub 文件编码错误");
  return JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
}
async function branchHead(branch: string, base: string) {
  const existing = await optional(readRef(branch));
  if (existing) return existing.object.sha;
  try {
    await api("/git/refs", "POST", { ref: `refs/heads/${branch}`, sha: base });
    return base;
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) return (await readRef(branch)).object.sha;
    throw error;
  }
}
async function pullRequest(branch: string, title: string, application: boolean) {
  const { owner, base } = repoConfig();
  const query = new URLSearchParams({ head: `${owner}:${branch}`, base, state: "open" });
  const find = async () => (await api<{ html_url: string }[]>(`/pulls?${query}`))[0]?.html_url;
  const existing = await find();
  if (existing) return existing;
  try {
    return (await api<{ html_url: string }>("/pulls", "POST", {
      title, head: branch, base,
      body: application
        ? "申请人已通过 X OAuth 核实数字 ID。请复核实战作品、活跃度及红线，在本 PR 中将申请替换为正式档案后合并。"
        : "此变更由档案对应的 X 数字 ID 登录后提交。请核对变更内容。",
    })).html_url;
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      const url = await find();
      if (url) return url;
    }
    throw error;
  }
}
function documentFor(owner: Identity, change: Change, creator?: Creator) {
  if (change.kind === "application") {
    if (creator) throw new ChangeError(409, "此 X ID 已有档案，请使用本人认领入口");
    return applicationDocument(owner, change.input);
  }
  if (!creator) throw new ChangeError(404, "未找到与当前登录 X ID 对应的档案");
  return editProfile(creator, owner, change.input);
}

export async function writeChange(owner: Identity, change: Change, local?: Creator, preview = false): Promise<WriteResult> {
  const id = IdSchema.parse(owner.id);
  const profilePath = `data/creators/${id}.json`;
  const application = change.kind === "application";
  const path = application ? `data/applications/${id}.json` : profilePath;
  const mode = githubWriteMode();
  if (preview || mode === "preview") return { mode: "preview", path, document: documentFor(owner, change, local) };
  const { base } = repoConfig();
  const usePr = application || mode === "pr";
  try {
    const baseSha = (await readRef(base)).object.sha;
    const baseProfile = await readFile(profilePath, baseSha);
    const creator = baseProfile ? CreatorSchema.parse(decode(baseProfile)) : undefined;
    if (application && creator) throw new ChangeError(409, "此 X ID 已有档案");
    if (!application && !creator) throw new ChangeError(404, "仓库中没有此 X ID 的档案");
    if (application && await readFile(path, baseSha)) throw new ChangeError(409, "仓库中已有此 X ID 的待核验申请");
    const topic = application ? `xwho/application-${id}` : `xwho/profile-${id}-${baseProfile!.sha.slice(0, 12)}`;
    const branch = usePr ? topic : base;
    const head = usePr ? await branchHead(branch, baseSha) : baseSha;
    const file = head === baseSha ? (application ? null : baseProfile) : await readFile(path, head);
    const previous = file ? decode(file) : null;
    const document = documentFor(owner, change, application ? undefined : previous ? CreatorSchema.parse(previous) : undefined);
    const title = application ? `申请入库 · X ID ${id}` : `本人档案变更 · X ID ${id}`;
    let url: string | undefined;
    if (JSON.stringify(previous) !== JSON.stringify(document)) {
      const result = await api<{ commit: { html_url: string } }>(`/contents/${path}`, "PUT", {
        message: title, branch, content: Buffer.from(JSON.stringify(document, null, 2) + "\n").toString("base64"),
        ...(file ? { sha: file.sha } : {}),
      });
      url = result.commit.html_url;
    } else if (head === baseSha || !usePr) return { mode: "unchanged" };
    if (usePr && creator && JSON.stringify(document) === JSON.stringify(creator)) return { mode: "unchanged" };
    if (usePr) return { mode: "pr", url: await pullRequest(branch, title, application) };
    return { mode: "direct", url: url! };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 409 || error.status === 422) throw new ChangeError(409, "仓库版本已变化，请刷新后重试");
      throw new ChangeError(502, "GitHub 暂未完成写入，请检查仓库权限后重试");
    }
    throw error;
  }
}
