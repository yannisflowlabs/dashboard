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

    const res = await drive.files.list({
      q: `name contains '${q.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.document' and trashed = false`,
      fields: "files(id, name, createdTime, webViewLink)",
      orderBy: "createdTime desc",
      pageSize: 10,
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
