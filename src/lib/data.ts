import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CreatorSchema, MilestoneSchema, validationMessage, verticals, type Creator, type Milestone } from "./schema";

export type CreatorFile = { filename: string; value: unknown };
export type Dataset = { creators: Creator[]; milestones: Milestone[] };
export const dataRoot = () => path.join(process.cwd(), "data");

export function validateDataset(files: CreatorFile[], eventInput: unknown): Dataset {
  const owners = new Set<string>();
  const handles = new Set<string>();
  const creators = files.map(({ filename, value }) => {
    const result = CreatorSchema.safeParse(value);
    if (!result.success) throw new Error(`${filename} · ${validationMessage(result.error)}`);
    const c = result.data;
    if (owners.has(c.x_user_id)) throw new Error(`重复 x_user_id · ${c.x_user_id}`);
    if (filename !== `${c.x_user_id}.json`) throw new Error(`文件名 ${filename} 与 x_user_id ${c.x_user_id} 不一致`);
    if (handles.has(c.handle.toLowerCase())) throw new Error(`重复 handle · @${c.handle}`);
    owners.add(c.x_user_id);
    handles.add(c.handle.toLowerCase());
    return c;
  });
  const result = z.array(MilestoneSchema).safeParse(eventInput);
  if (!result.success) throw new Error(`milestones.json · ${validationMessage(result.error)}`);
  const ids = new Set<string>();
  for (const event of result.data) {
    if (ids.has(event.id)) throw new Error(`重复事件 id · ${event.id}`);
    if (!owners.has(event.x_user_id)) throw new Error(`事件 ${event.id} 引用未知 x_user_id · ${event.x_user_id}`);
    ids.add(event.id);
  }
  return { creators, milestones: result.data };
}

export function readJson(filename: string): unknown {
  try { return JSON.parse(readFileSync(filename, "utf8")); }
  catch (cause) { throw new Error(`无法读取 JSON 文件 ${filename}`, { cause }); }
}

export function readDataset(root = dataRoot()): Dataset {
  const dir = path.join(root, "creators");
  const files = readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.name !== ".gitkeep" && entry.name !== ".DS_Store")
    .map(entry => {
      if (!entry.isFile() || !/^\d+\.json$/.test(entry.name)) throw new Error(`无效创作者文件名 · ${entry.name}`);
      return { filename: entry.name, value: readJson(path.join(dir, entry.name)) };
    });
  return validateDataset(files, readJson(path.join(root, "milestones.json")));
}

export function publicCreators(creators: Creator[]) {
  return creators.filter(c => c.claim_status !== "hidden");
}
export function publicCreatorByHandle(creators: Creator[], handle: string) {
  return creators.find(c => c.claim_status !== "hidden" && c.handle.toLowerCase() === handle.toLowerCase());
}
export function verticalCounts(creators: Creator[]) {
  const counts = Object.fromEntries(verticals.map(v => [v, 0])) as Record<Creator["vertical"], number>;
  const visible = publicCreators(creators);
  for (const c of visible) counts[c.vertical]++;
  return { all: visible.length, ...counts };
}

export const PAGE_SIZE = 24;
export type DirectoryQuery = {
  q?: string; vertical?: string; role?: string; cooperation?: string; claimedFirst?: boolean;
  open?: boolean; deep?: boolean; sort?: string; page?: number;
};
export function directoryParams(params: URLSearchParams): DirectoryQuery {
  const str = (key: string) => params.get(key) || undefined;
  return {
    q: str("q"), vertical: str("vertical"), role: str("role"), cooperation: str("cooperation"),
    claimedFirst: str("claimedFirst") === "1", open: str("open") === "1", deep: str("deep") === "1",
    sort: str("sort"), page: Number(str("page")) || 1,
  };
}
function card(c: Creator) {
  return {
    x_user_id: c.x_user_id, handle: c.handle, display_name: c.display_name, vertical: c.vertical,
    verification_tier: c.verification_tier, role_tags: c.role_tags, sub_tags: c.sub_tags,
    summary: c.summary, works: c.verified_works.slice(0, 2), followers_snapshot: c.followers_snapshot,
    claimed: c.claim_status === "claimed", open: c.claim_status === "claimed" && c.service_board?.open_for_collab === true,
  };
}
export function directory(creators: Creator[], query: DirectoryQuery = {}) {
  const visible = publicCreators(creators);
  const needle = query.q?.trim().replace(/^@/, "").toLowerCase();
  const rows = visible.filter(c => {
    const board = c.claim_status === "claimed" ? c.service_board : null;
    if (query.vertical && c.vertical !== query.vertical) return false;
    if (query.role && !c.role_tags.some(tag => tag === query.role)) return false;
    if (query.cooperation && !board?.cooperation_tags.some(tag => tag === query.cooperation)) return false;
    if (query.open && !board?.open_for_collab) return false;
    if (query.deep && c.verification_tier !== "deep-verified") return false;
    return !needle || [c.display_name, c.handle, c.summary, ...c.sub_tags, ...c.verified_works.map(w => w.title), board?.pitch]
      .some(field => field?.toLowerCase().includes(needle));
  });
  rows.sort((a, b) => {
    if (query.claimedFirst && a.claim_status !== b.claim_status) return a.claim_status === "claimed" ? -1 : 1;
    if (query.sort === "active") {
      const active = (c: Creator) => c.last_post_at ? Date.parse(c.last_post_at) : -Infinity;
      return active(b) - active(a) || a.handle.localeCompare(b.handle);
    }
    if (query.sort !== "followers" && a.verification_tier !== b.verification_tier) return a.verification_tier === "deep-verified" ? -1 : 1;
    return (b.followers_snapshot?.count ?? -1) - (a.followers_snapshot?.count ?? -1) || a.handle.localeCompare(b.handle);
  });
  const maxPage = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(maxPage, Math.max(1, Math.trunc(query.page || 1)));
  const offset = (page - 1) * PAGE_SIZE;
  return {
    items: rows.slice(offset, offset + PAGE_SIZE).map(card), total: rows.length, page, pages: maxPage, offset,
    counts: verticalCounts(visible),
    cooperationTags: [...new Set(visible.flatMap(c => c.claim_status === "claimed" ? c.service_board?.cooperation_tags ?? [] : []))].sort(),
  };
}
export type DirectoryResult = ReturnType<typeof directory>;
