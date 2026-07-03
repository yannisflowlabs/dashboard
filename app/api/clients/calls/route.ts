export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

// POST — créer/mettre à jour un call. Si `id` fourni → update, sinon create.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, clientEmail, title, callDate, recordingUrl, transcriptUrl, transcriptText, notes } = body;

    if (!id && !clientEmail) {
      return NextResponse.json({ error: "clientEmail requis" }, { status: 400 });
    }

    const data = {
      ...(title !== undefined && { title }),
      ...(callDate !== undefined && { callDate: new Date(callDate) }),
      ...(recordingUrl !== undefined && { recordingUrl }),
      ...(transcriptUrl !== undefined && { transcriptUrl }),
      ...(transcriptText !== undefined && { transcriptText }),
      ...(notes !== undefined && { notes }),
    };

    let call;
    if (id) {
      call = await getPrisma().clientCall.update({ where: { id: Number(id) }, data });
    } else {
      call = await getPrisma().clientCall.create({
        data: { clientEmail, ...data },
      });
    }

    return NextResponse.json({ call });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — supprimer un call ?id=
export async function DELETE(req: NextRequest) {
  try {
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
    await getPrisma().clientCall.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
