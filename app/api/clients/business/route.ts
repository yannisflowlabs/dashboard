export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

// POST — upsert des infos business d'un client { clientEmail, company?, industry?, dealAmount?, signedAt? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { clientEmail, company, industry, dealAmount, signedAt, status } = body;

    if (!clientEmail) {
      return NextResponse.json({ error: "clientEmail requis" }, { status: 400 });
    }

    const data = {
      company: company ?? null,
      industry: industry ?? null,
      dealAmount: dealAmount !== undefined && dealAmount !== null && dealAmount !== "" ? Number(dealAmount) : null,
      signedAt: signedAt ? new Date(signedAt) : null,
      ...(status !== undefined ? { status } : {}),
    };

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
