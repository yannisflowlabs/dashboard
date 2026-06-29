export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

// GET — liste toutes les reviews + stats
export async function GET() {
  const reviews = await getPrisma().callReview.findMany({
    orderBy: { startTime: "desc" },
  });

  const showed = reviews.filter((r) => r.status === "showed").length;
  const noshow = reviews.filter((r) => r.status === "noshow").length;
  // "refused" existants en base sont comptés comme annulés (migration progressive)
  const cancelled = reviews.filter((r) => r.status === "cancelled" || r.status === "refused").length;

  // Taux de présence = showed / (showed + noshow) — exclut annulés
  const relevantTotal = showed + noshow;
  const showRate = relevantTotal > 0 ? Math.round((showed / relevantTotal) * 100) : null;

  return NextResponse.json({
    reviews,
    stats: {
      total: reviews.length,
      showed,
      noshow,
      cancelled,
      relevantTotal,
      showRate,
    },
  });
}

// POST — enregistre ou met à jour une review
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { bookingId, bookingUid, attendeeName, attendeeEmail, startTime, status, calStatus } = body;

  if (!bookingId || !bookingUid || !status) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const review = await getPrisma().callReview.upsert({
    where: { bookingId: Number(bookingId) },
    update: { status },
    create: {
      bookingId: Number(bookingId),
      bookingUid,
      attendeeName: attendeeName ?? "Inconnu",
      attendeeEmail: attendeeEmail ?? "",
      startTime: new Date(startTime),
      status,
      calStatus: calStatus ?? "accepted",
    },
  });

  return NextResponse.json({ review });
}
