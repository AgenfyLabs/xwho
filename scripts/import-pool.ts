import { closeSync, existsSync, mkdtempSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { dataRoot, readDataset, readJson, validateDataset, verticalCounts, type Dataset } from "../src/lib/data";
import { shanghaiDay } from "../src/lib/digest";
import { CreatorSchema, TierSchema, verticalNames, verticals, type Creator, type Tier } from "../src/lib/schema";

function poolRows(input: string): unknown[] {
  if (statSync(input).isDirectory()) {
    return readdirSync(input).filter(f => f.endsWith(".json")).sort().map(f => readJson(path.join(input, f)));
  }
  const value = readJson(input);
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && "creators" in value && Array.isArray(value.creators)) return value.creators;
  throw new Error("输入需要是档案数组、含 creators 数组的对象，或单人 JSON 文件目录");
}

function merge(existing: Creator | undefined, incoming: Creator): Creator {
  if (!existing) {
    if (incoming.claim_status !== "unclaimed" || incoming.service_board != null) throw new Error("批量导入只可新建未认领的空留言板档案");
    return incoming;
  }
  const sameTier = existing.verification_tier === incoming.verification_tier;
  const preferred = existing.verification_tier === "deep-verified" ? existing : incoming;
  const base = sameTier ? { ...existing, ...incoming } : preferred;
  return CreatorSchema.parse({
    ...base,
    last_post_at: base.last_post_at ?? incoming.last_post_at ?? existing.last_post_at,
    lead_sources: [...new Set([...existing.lead_sources, ...incoming.lead_sources])],
    claim_status: existing.claim_status,
    service_board: existing.service_board,
  });
}
export function planImport(before: Dataset, rows: unknown[], tier?: Tier, now = new Date()) {
  const byId = new Map(before.creators.map(c => [c.x_user_id, c]));
  const cutoff = new Date(`${shanghaiDay(now)}T00:00:00Z`);
  // February 29 maps to February 28 of the preceding year.
  const month = cutoff.getUTCMonth();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  if (cutoff.getUTCMonth() !== month) cutoff.setUTCDate(0);
  for (const [index, row] of rows.entries()) {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`第 ${index + 1} 条不是档案对象`);
    const candidate = CreatorSchema.parse({ claim_status: "unclaimed", verification_tier: tier, ...row });
    const existing = byId.get(candidate.x_user_id);
    if (!existing && candidate.last_post_at && shanghaiDay(candidate.last_post_at) < cutoff.toISOString().slice(0, 10)) {
      throw new Error(`@${candidate.handle} 已超过 12 个月未发帖，请先复核活跃度`);
    }
    byId.set(candidate.x_user_id, merge(existing, candidate));
  }
  return validateDataset([...byId].map(([id, value]) => ({ filename: `${id}.json`, value })), before.milestones);
}
export function importPool(input: string, root = dataRoot(), tier?: Tier, now = new Date()) {
  const lock = path.join(root, ".xwho-import.lock");
  const fd = openSync(lock, "wx");
  let staging: string | undefined;
  try {
    writeFileSync(fd, `${process.pid}\n`);
    const before = readDataset(root);
    const after = planImport(before, poolRows(input), tier, now);
    const old = new Map(before.creators.map(c => [c.x_user_id, JSON.stringify(c)]));
    const changed = after.creators.filter(c => old.get(c.x_user_id) !== JSON.stringify(c));
    staging = mkdtempSync(path.join(root, ".xwho-import-"));
    const writes = changed.map(c => {
      const name = `${c.x_user_id}.json`;
      const target = path.join(root, "creators", name);
      const temp = path.join(staging!, name);
      const previous = existsSync(target) ? readFileSync(target) : null;
      writeFileSync(temp, JSON.stringify(c, null, 2) + "\n");
      return { target, temp, previous };
    });
    const installed: typeof writes = [];
    try {
      for (const write of writes) {
        renameSync(write.temp, write.target);
        installed.push(write);
      }
      const checked = readDataset(root);
      return { changed: changed.length, counts: verticalCounts(checked.creators), total: checked.creators.length };
    } catch (error) {
      for (const { target, previous, temp } of installed.reverse()) {
        if (previous === null) rmSync(target);
        else { writeFileSync(temp, previous); renameSync(temp, target); }
      }
      throw error;
    }
  } finally {
    closeSync(fd);
    try { if (staging) rmSync(staging, { recursive: true, force: true }); }
    finally { rmSync(lock, { force: true }); }
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const { values } = parseArgs({ options: { input: { type: "string" }, tier: { type: "string" } } });
    if (!values.input) throw new Error("用法：npm run import:pool -- --input <JSON 或目录> [--tier deep-verified|api-verified]");
    const tier = values.tier === undefined ? undefined : TierSchema.parse(values.tier);
    const result = importPool(values.input, dataRoot(), tier);
    console.log(`全库校验通过 · 变更 ${result.changed} 份，库内 ${result.total} 份，公开 ${result.counts.all} 份`);
    for (const v of verticals) console.log(`${verticalNames[v]} ${result.counts[v]}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
