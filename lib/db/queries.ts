import { getDb } from ".";

// Anyone who has logged in is a world member. Called on every OAuth callback.
export async function touchMember(did: string) {
  const now = new Date().toISOString();
  await getDb()
    .insertInto("member")
    .values({ did, firstSeen: now, lastSeen: now })
    .onConflict((oc) => oc.column("did").doUpdateSet({ lastSeen: now }))
    .execute();
}

export async function listMemberDids(): Promise<string[]> {
  const rows = await getDb()
    .selectFrom("member")
    .select("did")
    .orderBy("lastSeen", "desc")
    .execute();
  return rows.map((r) => r.did);
}
