export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

const UMAMI_URL = process.env.UMAMI_URL ?? "https://umami-inky-three.vercel.app";
const UMAMI_USER = process.env.UMAMI_USERNAME ?? "admin";
const UMAMI_PASS = process.env.UMAMI_PASSWORD;
const UMAMI_WEBSITE_ID = process.env.UMAMI_WEBSITE_ID ?? "182bd53e-ea5c-4b20-9df7-e3dc0303f176";

export async function GET() {
  const steps: Record<string, unknown> = {};
  try {
    steps.hasPassword = !!UMAMI_PASS;
    steps.umamiUrl = UMAMI_URL;
    steps.websiteId = UMAMI_WEBSITE_ID;

    if (!UMAMI_PASS) {
      return NextResponse.json({ ...steps, stop: "UMAMI_PASSWORD non défini sur Vercel" });
    }

    const authRes = await fetch(`${UMAMI_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: UMAMI_USER, password: UMAMI_PASS }),
    });
    steps.authStatus = authRes.status;
    if (!authRes.ok) {
      steps.authBody = await authRes.text();
      return NextResponse.json({ ...steps, stop: "auth failed" });
    }
    const { token } = (await authRes.json()) as { token: string };
    steps.gotToken = !!token;

    const now = Date.now();
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
    const statsRes = await fetch(
      `${UMAMI_URL}/api/websites/${UMAMI_WEBSITE_ID}/stats?startAt=${oneYearAgo}&endAt=${now}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    steps.statsStatus = statsRes.status;
    steps.statsBody = await statsRes.json();

    return NextResponse.json(steps);
  } catch (err: unknown) {
    return NextResponse.json({ ...steps, error: err instanceof Error ? err.message : String(err) });
  }
}
