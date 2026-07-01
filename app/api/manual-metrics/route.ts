export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

// GET — lire toutes les métriques manuelles (clé → valeur)
export async function GET() {
  try {
    const metrics = await getPrisma().manualMetric.findMany();
    const map: Record<string, number> = {};
    for (const m of metrics) map[m.key] = m.value;
    return NextResponse.json(map);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — mettre à jour une métrique { key, value }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const key = typeof body?.key === "string" ? body.key : null;
    const value = Number(body?.value);

    if (!key || !Number.isFinite(value) || value < 0) {
      return NextResponse.json({ error: "key et value (>= 0) requis" }, { status: 400 });
    }

    const updated = await getPrisma().manualMetric.upsert({
      where: { key },
      update: { value: Math.round(value) },
      create: { key, value: Math.round(value) },
    });

    return NextResponse.json({ ok: true, key: updated.key, value: updated.value });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
