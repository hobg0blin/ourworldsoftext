import { NextRequest, NextResponse } from "next/server";
import { Client, l } from "@atproto/lex";
import { getSession } from "@/lib/auth/session";
import * as com from "@/lib/lexicons/com";

const COLLECTION = "com.ourworldsoftext.text";

// Create a text record in the logged-in user's repo.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text, xPosition, yPosition } = await request.json();
  if (typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (!Number.isInteger(xPosition) || !Number.isInteger(yPosition)) {
    return NextResponse.json(
      { error: "xPosition and yPosition must be integers" },
      { status: 400 },
    );
  }

  const lexClient = new Client(session);
  const createdAt = l.currentDatetimeString();
  const res = await lexClient.create(com.ourworldsoftext.text, {
    text,
    xPosition,
    yPosition,
    createdAt,
  });

  return NextResponse.json({ success: true, uri: res.uri, cid: res.cid });
}

// List the logged-in user's text records straight from their PDS.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URLSearchParams({
    repo: session.did,
    collection: COLLECTION,
    limit: "50",
  });
  const res = await session.fetchHandler(
    `/xrpc/com.atproto.repo.listRecords?${params}`,
    { method: "GET" },
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: `listRecords failed: ${res.status}` },
      { status: 502 },
    );
  }
  return NextResponse.json(await res.json());
}
