export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

// GET ?q=mot — cherche un mot-clé dans tous les transcripts, renvoie les calls correspondants + extrait
export async function GET(req: NextRequest) {
  try {
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
    if (q.length < 2) return NextResponse.json({ results: [] });

    const calls = await getPrisma().clientCall.findMany({
      where: { transcriptText: { contains: q } },
      orderBy: { callDate: "desc" },
    });

    const results = calls.map((c) => {
      // Extrait autour du premier match (contexte)
      const text = c.transcriptText ?? "";
      const idx = text.toLowerCase().indexOf(q.toLowerCase());
      const start = Math.max(0, idx - 60);
      const excerpt = idx >= 0 ? (start > 0 ? "…" : "") + text.slice(start, idx + q.length + 60) + "…" : "";
      return {
        callId: c.id,
        clientEmail: c.clientEmail,
        title: c.title,
        callDate: c.callDate,
        excerpt,
      };
    });

    return NextResponse.json({ results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
