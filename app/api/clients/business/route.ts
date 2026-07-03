export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

// POST — upsert des infos business d'un client { clientEmail, company?, industry?, dealAmount?, signedAt? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { clientEmail, company, industry, dealAmount, signedAt, status, sessionsTotal, sessionsDone, contextNote } = body;

    if (!clientEmail) {
      return NextResponse.json({ error: "clientEmail requis" }, { status: 400 });
    }

    // Mise à jour partielle : on ne touche qu'aux champs fournis
    const data: Record<string, unknown> = {};
    if (company !== undefined) data.company = company || null;
    if (industry !== undefined) data.industry = industry || null;
    if (dealAmount !== undefined) data.dealAmount = dealAmount !== null && dealAmount !== "" ? Number(dealAmount) : null;
    if (signedAt !== undefined) data.signedAt = signedAt ? new Date(signedAt) : null;
    if (status !== undefined) data.status = status;
    if (sessionsTotal !== undefined) data.sessionsTotal = sessionsTotal !== null && sessionsTotal !== "" ? Number(sessionsTotal) : null;
    if (sessionsDone !== undefined) data.sessionsDone = Number(sessionsDone) || 0;
    if (contextNote !== undefined) data.contextNote = contextNote || null;

    const info = await getPrisma().clientBusinessInfo.upsert({
      where: { clientEmail },
      update: data,
      create: { clientEmail, ...data },
    });

    return NextResponse.json({ business: info });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
