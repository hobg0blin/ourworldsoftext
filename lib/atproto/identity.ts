// Minimal identity resolution: handle -> DID, DID -> PDS endpoint.
// Cached in memory per server process; fine for a demo.

const PUBLIC_API = "https://public.api.bsky.app";
const PLC_DIRECTORY = "https://plc.directory";

const didCache = new Map<string, string>();
const pdsCache = new Map<string, string>();

export async function resolveHandle(handle: string): Promise<string> {
  const cached = didCache.get(handle);
  if (cached) return cached;

  const res = await fetch(
    `${PUBLIC_API}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
  );
  if (!res.ok) throw new Error(`could not resolve handle ${handle}`);
  const { did } = (await res.json()) as { did: string };
  didCache.set(handle, did);
  return did;
}

export async function toDid(identifier: string): Promise<string> {
  return identifier.startsWith("did:")
    ? identifier
    : resolveHandle(identifier);
}

type DidDocument = {
  service?: { id: string; type: string; serviceEndpoint: string }[];
};

export async function resolvePds(did: string): Promise<string> {
  const cached = pdsCache.get(did);
  if (cached) return cached;

  let docUrl: string;
  if (did.startsWith("did:plc:")) {
    docUrl = `${PLC_DIRECTORY}/${did}`;
  } else if (did.startsWith("did:web:")) {
    const host = decodeURIComponent(did.slice("did:web:".length));
    docUrl = `https://${host}/.well-known/did.json`;
  } else {
    throw new Error(`unsupported DID method: ${did}`);
  }

  const res = await fetch(docUrl);
  if (!res.ok) throw new Error(`could not fetch DID document for ${did}`);
  const doc = (await res.json()) as DidDocument;
  const pds = doc.service?.find(
    (s) => s.id === "#atproto_pds" || s.type === "AtprotoPersonalDataServer",
  )?.serviceEndpoint;
  if (!pds) throw new Error(`no PDS endpoint in DID document for ${did}`);

  pdsCache.set(did, pds);
  return pds;
}
