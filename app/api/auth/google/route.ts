export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/google";

// GET — redirige vers la page de consentement Google
export async function GET() {
  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
