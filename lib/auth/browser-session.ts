import { createHash, randomBytes } from "node:crypto";
import { getDb } from "../db";

export const SESSION_COOKIE = "owot_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function createBrowserSession(did: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  await getDb().deleteFrom("browser_session")
    .where("expiresAt", "<=", now).execute();
  await getDb().insertInto("browser_session").values({
    tokenHash: hashToken(token),
    did,
    expiresAt: now + SESSION_MAX_AGE * 1000,
  }).execute();
  return token;
}

export async function resolveBrowserSession(token?: string): Promise<string | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = await getDb().selectFrom("browser_session")
    .select("did")
    .where("tokenHash", "=", hashToken(token))
    .where("expiresAt", ">", Date.now())
    .executeTakeFirst();
  return row?.did ?? null;
}

export async function deleteBrowserSession(token?: string): Promise<void> {
  if (!token) return;
  await getDb().deleteFrom("browser_session")
    .where("tokenHash", "=", hashToken(token)).execute();
}
