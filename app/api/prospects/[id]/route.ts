export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { stage, notes, name, phone, clientSince, stageUpdatedAt } = body;

  // Saisie manuelle de stageUpdatedAt (date picker)
  let stageUpdatedAtValue: Date | null | undefined = undefined;
  if (stageUpdatedAt !== undefined) {
    stageUpdatedAtValue = stageUpdatedAt ? new Date(stageUpdatedAt) : null;
  } else if (stage !== undefined) {
    // Changement de stage automatique → date du jour
    stageUpdatedAtValue = new Date();
  }

  // Auto-gestion clientSince selon le stage
  let clientSinceValue: Date | null | undefined = undefined;
  if (clientSince !== undefined) {
    clientSinceValue = clientSince ? new Date(clientSince) : null;
  } else if (stage === "client") {
    const current = await getPrisma().prospect.findUnique({ where: { id: Number(id) }, select: { clientSince: true } });
    if (!current?.clientSince) clientSinceValue = new Date();
  } else if (stage !== undefined && stage !== "client") {
    clientSinceValue = null;
  }

  const prospect = await getPrisma().prospect.update({
    where: { id: Number(id) },
    data: {
      ...(stage !== undefined && { stage }),
      ...(notes !== undefined && { notes }),
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(clientSinceValue !== undefined && { clientSince: clientSinceValue }),
      ...(stageUpdatedAtValue !== undefined && { stageUpdatedAt: stageUpdatedAtValue }),
    },
  });

  return NextResponse.json({ prospect });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getPrisma().prospect.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
