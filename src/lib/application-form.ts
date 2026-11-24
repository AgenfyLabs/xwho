import { z } from "zod";
import { ApplicationInputSchema } from "./identity";
import { verticals } from "./schema";
import type { XApplication } from "./x-application";

const fieldsSchema = z.object({ vertical: z.union([z.enum(verticals), z.literal("")]), summary: z.string(), works: z.string() });
export type ApplicationFields = z.infer<typeof fieldsSchema>;
const draftSchema = z.object({ imported: z.boolean(), fields: fieldsSchema.partial() });
export type ApplicationDraft = z.infer<typeof draftSchema>;
export const emptyDraft: ApplicationDraft = { imported: false, fields: {} };
export const draftKey = (id: string) => `xwho.application.draft.${id}`;
const pendingSchema = z.object({ id: z.string(), attempt: z.uuid(), expires: z.number(), fields: fieldsSchema.partial().optional() });
export const pendingApplicationKey = "xwho.application";

function stored(storage: Pick<Storage, "getItem">, key: string): unknown {
  try { return JSON.parse(storage.getItem(key) || "null"); } catch { return null; }
}
export function readDraft(storage: Pick<Storage, "getItem">, id: string): ApplicationDraft {
  return draftSchema.safeParse(stored(storage, draftKey(id))).data ?? emptyDraft;
}
export function withSuggestions(saved?: Partial<ApplicationFields>, suggestions?: XApplication): ApplicationFields {
  return {
    vertical: saved?.vertical ?? suggestions?.vertical ?? "",
    summary: saved?.summary ?? suggestions?.summary ?? "",
    works: saved?.works ?? suggestions?.pinnedPost ?? "",
  };
}
export function applicationInput(fields: ApplicationFields) {
  return ApplicationInputSchema.safeParse({
    vertical: fields.vertical, summary: fields.summary, work_urls: fields.works.split(/\r?\n/).map(s => s.trim()).filter(Boolean),
  });
}

// The redirect can resume an import for the same account. It carries no publication intent.
export function takeApplication(storage: Pick<Storage, "getItem" | "removeItem">, attempt: string | undefined, id: string | undefined, now = Date.now()) {
  if (!attempt || !id) return;
  const pending = pendingSchema.safeParse(stored(storage, pendingApplicationKey));
  if (!pending.success || pending.data.attempt !== attempt) return;
  storage.removeItem(pendingApplicationKey);
  if (pending.data.id === id && pending.data.expires > now) return pending.data;
}
