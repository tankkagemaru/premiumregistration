import { z } from "zod";

/** Allowed document kinds + upload constraints (mirrored on the client). */
export const DOC_KINDS = ["passport", "transcript", "other"] as const;
export const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];
export const MAX_DOC_BYTES = 5 * 1024 * 1024; // 5 MB

/** A document the client wants to upload — metadata only; the file itself is
 *  PUT directly to Storage via the returned signed URL. */
export const documentMetaSchema = z.object({
  kind: z.enum(DOC_KINDS),
  filename: z.string().min(1).max(200),
  contentType: z.enum(ALLOWED_DOC_TYPES as [string, ...string[]]),
  size: z.number().int().positive().max(MAX_DOC_BYTES),
});

export type DocumentMeta = z.infer<typeof documentMetaSchema>;

export interface UploadTarget {
  kind: string;
  path: string;
  token: string;
}
