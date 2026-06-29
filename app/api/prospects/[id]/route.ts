import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { stage, notes, name, phone } = body;

  const prospect = await prisma.prospect.update({
    where: { id: Number(id) },
    data: {
      ...(stage !== undefined && { stage }),
      ...(notes !== undefined && { notes }),
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
    },
  });

  return NextResponse.json({ prospect });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.prospect.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
