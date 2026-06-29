import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const API_KEY = process.env.CALCOM_API_KEY!;
const BASE = "https://api.cal.com/v2";
const HEADERS = {
  Authorization: `Bearer ${API_KEY}`,
  "cal-api-version": "2024-08-13",
};

async function fetchBookings(status: "upcoming" | "past" | "cancelled" | "rejected", limit = 50) {
  const res = await fetch(`${BASE}/bookings?status=${status}&limit=${limit}`, { headers: HEADERS });
  const json = await res.json();
  return (json.data ?? []) as Record<string, unknown>[];
}

function formatBooking(b: Record<string, unknown>, calStatus: string) {
  const attendees = (b.attendees as { name: string; email: string }[]) ?? [];
  const start = new Date(b.start as string);
  const end = new Date(b.end as string);

  return {
    id: b.id as number,
    uid: b.uid as string,
    title: b.title as string,
    calStatus,
    start: b.start as string,
    end: b.end as string,
    duration: b.duration as number,
    meetingUrl: (b.meetingUrl ?? b.location ?? null) as string | null,
    cancellationReason: (b.cancellationReason ?? null) as string | null,
    attendee: attendees[0]
      ? { name: attendees[0].name, email: attendees[0].email }
      : null,
    dateLabel: start.toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long",
    }),
    timeLabel: `${start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} — ${end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    isToday: start.toDateString() === new Date().toDateString(),
  };
}

export async function GET() {
  try {
    // Fetch all booking types in parallel
    const [upcoming, past, cancelled, rejected] = await Promise.all([
      fetchBookings("upcoming", 10),
      fetchBookings("past", 50),
      fetchBookings("cancelled", 50),
      fetchBookings("rejected", 50),
    ]);

    // Auto-create reviews for "rejected" bookings that aren't reviewed yet
    const existingReviews = await prisma.callReview.findMany({
      select: { bookingId: true },
    });
    const reviewedIds = new Set(existingReviews.map((r) => r.bookingId));

    for (const b of rejected) {
      const id = b.id as number;
      if (!reviewedIds.has(id)) {
        const attendees = (b.attendees as { name: string; email: string }[]) ?? [];
        await prisma.callReview.create({
          data: {
            bookingId: id,
            bookingUid: b.uid as string,
            attendeeName: attendees[0]?.name ?? "Inconnu",
            attendeeEmail: attendees[0]?.email ?? "",
            startTime: new Date(b.start as string),
            status: "cancelled",
            calStatus: "rejected",
          },
        });
        reviewedIds.add(id);
      }
    }

    // Auto-import prospects depuis tous les bookings (upcoming + past)
    const allBookings = [...upcoming, ...past];
    for (const b of allBookings) {
      const attendees = (b.attendees as { name: string; email: string }[]) ?? [];
      const attendee = attendees[0];
      if (!attendee?.email) continue;
      const isUpcoming = upcoming.includes(b);
      await prisma.prospect.upsert({
        where: { email: attendee.email },
        update: { name: attendee.name, calBookingUid: b.uid as string },
        create: {
          name: attendee.name,
          email: attendee.email,
          source: "calcom",
          stage: isUpcoming ? "call_booked" : "call_done",
          calBookingUid: b.uid as string,
        },
      });
    }

    // Reload reviews after auto-creation
    const allReviews = await prisma.callReview.findMany({
      select: { bookingId: true, status: true },
    });
    const reviewMap = new Map(allReviews.map((r) => [r.bookingId, r.status]));
    const reviewedIdsFinal = new Set(allReviews.map((r) => r.bookingId));

    // Calls past non reviewés dans les 14 derniers jours (uniquement accepted)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const pendingReview = past
      .filter((b) => {
        const start = new Date(b.start as string);
        return !reviewedIdsFinal.has(b.id as number) && start >= fourteenDaysAgo;
      })
      .map((b) => formatBooking(b, "accepted"));

    // Tous les calls historiques pour la page historique (past + cancelled + rejected)
    const allPast = [
      ...past.map((b) => formatBooking(b, "accepted")),
      ...cancelled.map((b) => formatBooking(b, "cancelled")),
      ...rejected.map((b) => formatBooking(b, "rejected")),
    ].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisWeek = upcoming.filter((b) => {
      const d = new Date(b.start as string);
      return d >= startOfWeek && d <= endOfWeek;
    });
    const thisMonth = upcoming.filter((b) => {
      const d = new Date(b.start as string);
      return d >= startOfMonth;
    });

    return NextResponse.json({
      upcoming: upcoming.map((b) => formatBooking(b, "accepted")),
      allPast,
      pendingReview,
      reviewMap: Object.fromEntries(reviewMap),
      stats: {
        thisWeek: thisWeek.length,
        thisMonth: thisMonth.length,
        total: upcoming.length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur Cal.com inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
