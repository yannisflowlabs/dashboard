export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthenticatedClient } from "@/lib/google";

// GET ?name=Elisabeth — cherche le prochain événement Google Calendar contenant ce nom
export async function GET(req: NextRequest) {
  const name = (new URL(req.url).searchParams.get("name") ?? "").trim();
  if (!name) return NextResponse.json({ event: null });

  try {
    const auth = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth });

    const now = new Date().toISOString();
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: now,
      maxResults: 20,
      singleEvents: true,
      orderBy: "startTime",
      q: name,
    });

    const events = res.data.items ?? [];
    const next = events[0] ?? null;

    if (!next) return NextResponse.json({ event: null });

    return NextResponse.json({
      event: {
        id: next.id,
        summary: next.summary,
        start: next.start?.dateTime ?? next.start?.date,
        end: next.end?.dateTime ?? next.end?.date,
        meetLink: next.hangoutLink ?? null,
        htmlLink: next.htmlLink ?? null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    if (message.includes("Google non connecté")) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
