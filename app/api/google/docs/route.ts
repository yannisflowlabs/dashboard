export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthenticatedClient } from "@/lib/google";

// GET ?docId=xxx — lit l'onglet "Transcription" du Google Doc Gemini
export async function GET(req: NextRequest) {
  const docId = (new URL(req.url).searchParams.get("docId") ?? "").trim();
  if (!docId) return NextResponse.json({ error: "docId requis" }, { status: 400 });

  try {
    const auth = await getAuthenticatedClient();
    const docs = google.docs({ version: "v1", auth });

    const doc = await docs.documents.get({ documentId: docId });
    const tabs = doc.data.tabs;

    let transcriptContent = "";

    if (tabs && tabs.length > 0) {
      // Cherche l'onglet "Transcription" (souvent le 2ème)
      const transcriptTab =
        tabs.find((t) =>
          (t.tabProperties?.title ?? "").toLowerCase().includes("transcri")
        ) ?? tabs[1] ?? tabs[0];

      const body = transcriptTab?.documentTab?.body;
      if (body?.content) {
        transcriptContent = body.content
          .flatMap((el) => el.paragraph?.elements ?? [])
          .map((el) => el.textRun?.content ?? "")
          .join("")
          .trim();
      }
    } else {
      // Doc sans onglets (ancien format) — lit le body principal
      const body = doc.data.body;
      if (body?.content) {
        transcriptContent = body.content
          .flatMap((el) => el.paragraph?.elements ?? [])
          .map((el) => el.textRun?.content ?? "")
          .join("")
          .trim();
      }
    }

    return NextResponse.json({ transcript: transcriptContent });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    if (message.includes("Google non connecté")) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
