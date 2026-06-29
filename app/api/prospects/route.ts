export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const prospects = await getPrisma().prospect.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ prospects });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone, source, stage, notes, calBookingUid } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Nom et email requis" }, { status: 400 });
  }

  const prospect = await getPrisma().prospect.upsert({
    where: { email },
    update: {
      name,
      ...(phone && { phone }),
      ...(notes !== undefined && { notes }),
      ...(calBookingUid && { calBookingUid }),
    },
    create: {
      name,
      email,
      phone: phone ?? null,
      source: source ?? "calcom",
      stage: stage ?? "prospect",
      notes: notes ?? null,
      calBookingUid: calBookingUid ?? null,
    },
  });

  return NextResponse.json({ prospect });
}
