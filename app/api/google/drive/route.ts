export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthenticatedClient } from "@/lib/google";

// GET ?q=Elisabeth — cherche des fichiers Gemini dans Drive par nom de client
export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ files: [] });

  try {
    const auth = await getAuthenticatedClient();
    const drive = google.drive({ version: "v3", auth });

    const safe = q.replace(/'/g, "\\'");
    // On accepte Google Docs, .docx et PDF ; et on inclut les Drive partagés
    const mimeFilter = [
      "mimeType = 'application/vnd.google-apps.document'",
      "mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'",
      "mimeType = 'application/pdf'",
    ].join(" or ");

    const res = await drive.files.list({
      q: `name contains '${safe}' and (${mimeFilter}) and trashed = false`,
      fields: "files(id, name, createdTime, webViewLink, mimeType)",
      orderBy: "createdTime desc",
      pageSize: 15,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      corpora: "allDrives",
    });

    return NextResponse.json({ files: res.data.files ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    if (message.includes("Google non connecté")) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
