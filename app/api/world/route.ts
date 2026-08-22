import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listWorldTexts } from "@/lib/world";

// Every text record from every world member, read live from their PDSes.
// Members come from WORLD_MEMBERS plus the logged-in user. Public route.
export async function GET() {
  const session = await getSession();
  const texts = await listWorldTexts(session?.did);
  return NextResponse.json({ texts });
}
