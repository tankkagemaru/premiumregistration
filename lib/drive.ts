import "server-only";
import { serverEnv } from "./env";

/**
 * Google Shared Drive mirror — SCAFFOLD (Phase 6).
 *
 * The core registration flow does not depend on this: files land in Supabase
 * Storage first, and a background job (Vercel cron → app/api/cron/drive-mirror)
 * copies each new file into a Shared Drive folder and writes the Drive link
 * back to registration_documents.drive_url.
 *
 * To make it live: `npm i googleapis`, then implement `mirrorFile` using a
 * service-account JWT (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY) with
 * the Drive API, uploading into GDRIVE_SHARED_DRIVE_FOLDER_ID
 * (supportsAllDrives: true). Kept modular so it can be added without touching
 * the submit pipeline.
 */
export const driveConfigured = Boolean(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GDRIVE_SHARED_DRIVE_FOLDER_ID,
);

export async function mirrorFile(_args: {
  buffer: ArrayBuffer;
  filename: string;
  mimeType: string;
}): Promise<string | null> {
  if (!driveConfigured) return null;
  void serverEnv;
  // TODO(phase6): upload to the Shared Drive and return the webViewLink.
  return null;
}
