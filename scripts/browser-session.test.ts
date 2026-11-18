import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { test } from "node:test";

test("browser sessions isolate accounts, expire, and survive database reopen", async () => {
  const dir = await mkdtemp(join(tmpdir(), "owot-session-test-"));
  process.env.DATABASE_PATH = join(dir, "test.db");
  const { getDb } = await import("../lib/db");
  const { getMigrator } = await import("../lib/db/migrations");
  const { createBrowserSession, resolveBrowserSession, deleteBrowserSession } =
    await import("../lib/auth/browser-session");
  try {
    const result = await getMigrator().migrateToLatest();
    assert.ifError(result.error);
    const again = await getMigrator().migrateToLatest();
    assert.ifError(again.error);
    const alice = "did:plc:alice";
    const bob = "did:plc:bob";
    const a = await createBrowserSession(alice);
    const b = await createBrowserSession(bob);
    assert.notEqual(a, b);
    assert.equal(await resolveBrowserSession(a), alice);
    assert.equal(await resolveBrowserSession(b), bob);
    assert.equal(await resolveBrowserSession(alice), null);
    assert.equal(await resolveBrowserSession("x".repeat(43)), null);
    assert.equal(await resolveBrowserSession(undefined), null);
    assert.equal(await resolveBrowserSession(a.slice(0, -1) + "."), null);
    const hash = (token: string) => createHash("sha256").update(token).digest("hex");
    const rows = await getDb().selectFrom("browser_session").selectAll().execute();
    assert.equal(rows.some((row) => row.tokenHash === a), false);
    // A separate connection sees the persisted session; no in-memory token map.
    const { default: Database } = await import("better-sqlite3");
    const reopened = new Database(process.env.DATABASE_PATH);
    assert.deepEqual(reopened.prepare("SELECT did FROM browser_session WHERE tokenHash = ?").get(hash(a)), { did: alice });
    reopened.close();
    await deleteBrowserSession(alice); // Forged legacy DID cannot log Alice out.
    assert.equal(await resolveBrowserSession(a), alice);
    await deleteBrowserSession(a);
    assert.equal(await resolveBrowserSession(a), null);
    assert.equal(await resolveBrowserSession(b), bob);
    await getDb().updateTable("browser_session").set({ expiresAt: Date.now() - 1 })
      .where("tokenHash", "=", hash(b)).execute();
    assert.equal(await resolveBrowserSession(b), null);
  } finally {
    await getDb().destroy();
    await rm(dir, { recursive: true, force: true });
  }
});
