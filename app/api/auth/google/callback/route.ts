export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createOAuthClient } from "@/lib/google";
import { getPrisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://dashboard-hlot.vercel.app";

export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${BASE_URL}/clients?google=error`);
  }

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);

    await getPrisma().googleToken.upsert({
      where: { id: 1 },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token ?? "",
        expiresAt: new Date(tokens.expiry_date!),
      },
      create: {
        id: 1,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token ?? "",
        expiresAt: new Date(tokens.expiry_date!),
      },
    });

    return NextResponse.redirect(`${BASE_URL}/clients?google=connected`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(`${BASE_URL}/clients?google=error`);
  }
}
