import { NextRequest, NextResponse } from "next/server";
import { Client, l } from "@atproto/lex";
import { getSession } from "@/lib/auth/session";
import { listTextRecords } from "@/lib/world";
import * as com from "@/lib/lexicons/com";

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
  const res = await lexClient.create(com.ourworldsoftext.text, {
    text,
    xPosition,
    yPosition,
    createdAt: l.currentDatetimeString(),
  });

  return NextResponse.json({ success: true, uri: res.uri, cid: res.cid });
}

// The logged-in user's text records, read from their PDS.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const texts = await listTextRecords(session.did);
  return NextResponse.json({ texts });
}
