import { z } from "zod";
import { ApplicationInputSchema } from "./identity";
import { verticals } from "./schema";
import type { XApplication } from "./x-application";

const fieldsSchema = z.object({ vertical: z.union([z.enum(verticals), z.literal("")]), summary: z.string(), works: z.string() });
export type ApplicationFields = z.infer<typeof fieldsSchema>;
const pendingSchema = z.object({ id: z.string(), attempt: z.uuid(), expires: z.number(), preview: z.boolean(), fields: fieldsSchema });
export const pendingApplicationKey = "xwho.application";

export function withSuggestions(saved?: ApplicationFields, suggestions?: XApplication): ApplicationFields {
  return {
    vertical: saved?.vertical || suggestions?.vertical || "",
    summary: saved?.summary.trim() || suggestions?.summary || "",
    works: saved?.works.trim() || suggestions?.pinnedPost || "",
  };
}
export function applicationInput(fields: ApplicationFields) {
  return ApplicationInputSchema.safeParse({
    vertical: fields.vertical, summary: fields.summary, work_urls: fields.works.split(/\r?\n/).map(s => s.trim()).filter(Boolean),
  });
}

// Consume the original click once, before any write. A different account cannot resume it.
export function takeApplication(storage: Pick<Storage, "getItem" | "removeItem">, attempt: string | undefined, id: string | undefined, now = Date.now()) {
  const pending = pendingSchema.safeParse(JSON.parse(storage.getItem(pendingApplicationKey) || "null"));
  if (!pending.success || (attempt && pending.data.attempt !== attempt)) return;
  storage.removeItem(pendingApplicationKey);
  if (pending.data.id === id && pending.data.expires > now) return pending.data;
}
