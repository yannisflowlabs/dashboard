export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

// POST — créer une action { clientEmail, label, callId? } ou toggle { id, done }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, clientEmail, label, done, callId } = body;

    // Toggle / update d'une action existante
    if (id) {
      const action = await getPrisma().clientAction.update({
        where: { id: Number(id) },
        data: {
          ...(done !== undefined && { done: !!done }),
          ...(label !== undefined && { label }),
        },
      });
      return NextResponse.json({ action });
    }

    // Création
    if (!clientEmail || !label) {
      return NextResponse.json({ error: "clientEmail et label requis" }, { status: 400 });
    }
    const action = await getPrisma().clientAction.create({
      data: { clientEmail, label, callId: callId ? Number(callId) : null },
    });
    return NextResponse.json({ action });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — supprimer une action ?id=
export async function DELETE(req: NextRequest) {
  try {
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
    await getPrisma().clientAction.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
