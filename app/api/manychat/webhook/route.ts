export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    await prisma.manychatDmEvent.create({
      data: {
        contactId: body?.id ?? body?.subscriber_id ?? null,
        flowName: body?.flow_name ?? body?.name ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET pour tester que l'endpoint est vivant
export async function GET() {
  const total = await prisma.manychatDmEvent.count();
  return NextResponse.json({ ok: true, totalDmEvents: total });
}
