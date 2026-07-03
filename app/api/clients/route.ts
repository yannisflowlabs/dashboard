export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

// GET — liste des clients (stage "client") avec calls, actions et infos business agrégés
export async function GET() {
  try {
    const prisma = getPrisma();

    // On suit les prospects au stage "client"
    const clients = await prisma.prospect.findMany({
      where: { stage: "client" },
      orderBy: { updatedAt: "desc" },
    });

    const emails = clients.map((c) => c.email);

    const [calls, actions, infos] = await Promise.all([
      prisma.clientCall.findMany({
        where: { clientEmail: { in: emails } },
        orderBy: { callDate: "desc" },
      }),
      prisma.clientAction.findMany({
        where: { clientEmail: { in: emails } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.clientBusinessInfo.findMany({
        where: { clientEmail: { in: emails } },
      }),
    ]);

    const infoMap = new Map(infos.map((i) => [i.clientEmail, i]));

    const result = clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      calls: calls
        .filter((call) => call.clientEmail === c.email)
        .map((call) => ({
          id: call.id,
          title: call.title,
          callDate: call.callDate,
          recordingUrl: call.recordingUrl,
          transcriptUrl: call.transcriptUrl,
          hasTranscript: !!call.transcriptText,
          notes: call.notes,
        })),
      actions: actions
        .filter((a) => a.clientEmail === c.email)
        .map((a) => ({ id: a.id, label: a.label, done: a.done, callId: a.callId })),
      business: infoMap.get(c.email)
        ? {
            company: infoMap.get(c.email)!.company,
            industry: infoMap.get(c.email)!.industry,
            dealAmount: infoMap.get(c.email)!.dealAmount,
            signedAt: infoMap.get(c.email)!.signedAt,
          }
        : null,
    }));

    return NextResponse.json({ clients: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
