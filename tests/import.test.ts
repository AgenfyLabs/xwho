import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { importPool, planImport } from "../scripts/import-pool";
import { board, creator, work } from "./fixtures";

let root: string;
const now = new Date("2026-02-01T12:00:00Z");
beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "xwho-pool-"));
  mkdirSync(path.join(root, "creators"));
  writeFileSync(path.join(root, "milestones.json"), "[]");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));
function run(rows: unknown) {
  const input = path.join(root, "pool.json");
  writeFileSync(input, JSON.stringify(rows));
  return importPool(input, root, "api-verified", now);
}
it("缺省层级按参数补齐，同 ID 幂等且第二次不重写文件", () => {
  const c = { ...creator(), verification_tier: undefined };
  expect(run({ creators: [c, c] }).changed).toBe(1);
  const target = path.join(root, "creators", "10001.json");
  const first = readFileSync(target);
  expect(run([c]).changed).toBe(0);
  expect(readFileSync(target)).toEqual(first);
});
it.each(["claimed", "hidden"] as const)("保持 %s 的身份与本人留言板，低层级资料只补缺来源和活跃时间", claim_status => {
  const c = creator({ claim_status, verified_works: [work], verification_tier: "deep-verified", service_board: board });
  writeFileSync(path.join(root, "creators", "10001.json"), JSON.stringify(c));
  const incoming = creator({ display_name: "低层级姓名", last_post_at: now.toISOString(), lead_sources: ["other"] });
  expect(run([incoming]).changed).toBe(1);
  const merged = JSON.parse(readFileSync(path.join(root, "creators", "10001.json"), "utf8"));
  expect(merged).toMatchObject({ claim_status, display_name: c.display_name, service_board: board, last_post_at: now.toISOString(), lead_sources: ["isolated-test", "other"] });
  expect(run([incoming]).changed).toBe(0);
});
it("批次冲突时不留下部分写入，后续重试可成功", () => {
  const c = creator();
  expect(() => run([c, creator({ x_user_id: "2", handle: c.handle.toUpperCase() })])).toThrow(/重复 handle/);
  expect(existsSync(path.join(root, "creators", "10001.json"))).toBe(false);
  expect(run([c]).changed).toBe(1);
});
it("自动导入不能新建认领留言板，超过十二个月的新增账号需先复核", () => {
  expect(() => run([creator({ claim_status: "claimed", service_board: board })])).toThrow(/只可新建未认领/);
  expect(() => run([creator({ last_post_at: "2024-01-01T00:00:00Z" })])).toThrow(/12 个月/);
});
it("高层级数据可升级旧档案并按数字 ID 处理合法改名", () => {
  const old = creator({ quote: { text: "低层级旧资料", source_url: work.url, published_at: "2026-02-01" } });
  const result = planImport({ creators: [old], milestones: [] }, [creator({ handle: "new_handle", verification_tier: "deep-verified", verified_works: [work] })], undefined, now);
  expect(result.creators[0]).toMatchObject({ handle: "new_handle", verification_tier: "deep-verified" });
  expect(result.creators[0].quote).toBeUndefined();
});
