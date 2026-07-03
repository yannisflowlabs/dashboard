export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { isGoogleConnected } from "@/lib/google";

export async function GET() {
  const connected = await isGoogleConnected();
  return NextResponse.json({ connected });
}
