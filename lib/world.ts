import { resolvePds, toDid } from "@/lib/atproto/identity";
import { listMemberDids } from "@/lib/db/queries";
import * as com from "@/lib/lexicons/com";

export const COLLECTION = "com.ourworldsoftext.text";

export type TextRecord = {
  uri: string;
  cid: string;
  authorDid: string;
  text: string;
  xPosition: number;
  yPosition: number;
  createdAt: string;
};

// Who's in the world: everyone who has ever logged in (member table), plus
// optional seeds from WORLD_MEMBERS (comma-separated handles or DIDs), plus
// whoever is logged in right now. Idea for later: filter by lastSeen so the
// world only shows recently-active people.
export async function worldMembers(extraDid?: string): Promise<string[]> {
  const seeds = (process.env.WORLD_MEMBERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const [seedDids, memberDids] = await Promise.all([
    Promise.all(seeds.map(toDid)),
    listMemberDids(),
  ]);
  const dids = [...memberDids, ...seedDids];
  if (extraDid) dids.push(extraDid);
  return [...new Set(dids)];
}

// All of one repo's text records, read straight from its PDS (no auth needed).
export async function listTextRecords(did: string): Promise<TextRecord[]> {
  const pds = await resolvePds(did);
  const out: TextRecord[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({
      repo: did,
      collection: COLLECTION,
      limit: "100",
    });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(
      `${pds}/xrpc/com.atproto.repo.listRecords?${params}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`listRecords ${did} failed: ${res.status}`);
    const body = (await res.json()) as {
      records: { uri: string; cid: string; value: unknown }[];
      cursor?: string;
    };

    for (const r of body.records) {
      try {
        const v = com.ourworldsoftext.text.$parse(r.value);
        out.push({
          uri: r.uri,
          cid: r.cid,
          authorDid: did,
          text: v.text,
          xPosition: v.xPosition,
          yPosition: v.yPosition,
          createdAt: v.createdAt,
        });
      } catch {
        // skip records that don't match the lexicon
      }
    }
    cursor = body.cursor;
  } while (cursor);

  return out;
}

// Everyone's records, newest first. A member whose PDS is unreachable is
// skipped rather than failing the whole world.
export async function listWorldTexts(extraDid?: string): Promise<TextRecord[]> {
  const dids = await worldMembers(extraDid);
  const results = await Promise.allSettled(dids.map(listTextRecords));
  const all = results.flatMap((r, i) => {
    if (r.status === "fulfilled") return r.value;
    console.warn(`world: skipping ${dids[i]}:`, r.reason);
    return [];
  });
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
