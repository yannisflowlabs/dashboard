export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

// POST { month: "2026-06", views: 12000 }
export async function POST(req: Request) {
  try {
    const { month, views } = await req.json() as { month: string; views: number };
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month invalide (format YYYY-MM)" }, { status: 400 });
    }
    if (!Number.isFinite(views) || views < 0) {
      return NextResponse.json({ error: "views invalide" }, { status: 400 });
    }
    const record = await getPrisma().reelsMonthlyView.upsert({
      where: { month },
      update: { views },
      create: { month, views },
    });
    return NextResponse.json(record);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET ?months=2026-06,2026-05 — retourne les vues pour une liste de mois
export async function GET(req: Request) {
  try {
    const param = new URL(req.url).searchParams.get("months") ?? "";
    const months = param.split(",").filter((m) => /^\d{4}-\d{2}$/.test(m.trim())).map((m) => m.trim());
    if (months.length === 0) return NextResponse.json({ records: [] });
    const records = await getPrisma().reelsMonthlyView.findMany({
      where: { month: { in: months } },
    });
    return NextResponse.json({ records });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
