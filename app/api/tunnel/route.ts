export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

const CALCOM_API_KEY = process.env.CALCOM_API_KEY!;
const CALCOM_BASE = "https://api.cal.com/v2";
const CALCOM_HEADERS = {
  Authorization: `Bearer ${CALCOM_API_KEY}`,
  "cal-api-version": "2024-08-13",
};

const UMAMI_URL = process.env.UMAMI_URL ?? "https://umami-inky-three.vercel.app";
const UMAMI_USER = process.env.UMAMI_USERNAME ?? "admin";
const UMAMI_PASS = process.env.UMAMI_PASSWORD;
const UMAMI_WEBSITE_ID = process.env.UMAMI_WEBSITE_ID ?? "182bd53e-ea5c-4b20-9df7-e3dc0303f176";

// Visites Umami sur une plage de dates précise (avec token réutilisable)
async function getUmamiToken(): Promise<string | null> {
  try {
    if (!UMAMI_PASS) return null;
    const authRes = await fetch(`${UMAMI_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: UMAMI_USER, password: UMAMI_PASS }),
    });
    if (!authRes.ok) return null;
    const { token } = await authRes.json() as { token: string };
    return token;
  } catch {
    return null;
  }
}

async function fetchUmamiVisits(startAt: number, endAt: number, token: string | null): Promise<number> {
  try {
    if (!token) return 0;
    const res = await fetch(`${UMAMI_URL}/api/websites/${UMAMI_WEBSITE_ID}/stats?startAt=${startAt}&endAt=${endAt}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return 0;
    const data = await res.json() as { visits?: number };
    return data.visits ?? 0;
  } catch {
    return 0;
  }
}

async function fetchCalBookings(status: string, limit = 100) {
  try {
    const res = await fetch(`${CALCOM_BASE}/bookings?status=${status}&limit=${limit}`, {
      headers: CALCOM_HEADERS,
    });
    const json = await res.json();
    return (json.data ?? []) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

// Liste des mois "YYYY-MM" couverts par une plage
function monthsBetween(rangeStart: Date, rangeEnd: Date): string[] {
  const months: string[] = [];
  const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (cursor <= rangeEnd) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

interface ClientRow {
  clientSince: Date | null;
  createdAt: Date;
  calBookingUid: string | null;
  email: string;
}

interface ReviewRow {
  bookingId: number;
  status: string;
}

// Calcule les chiffres de l'entonnoir pour une plage donnée
async function computeFunnel(
  rangeStart: Date,
  rangeEnd: Date,
  data: {
    upcoming: Record<string, unknown>[];
    past: Record<string, unknown>[];
    cancelled: Record<string, unknown>[];
    rejected: Record<string, unknown>[];
    clients: ClientRow[];
    reviews: ReviewRow[];
    umamiToken: string | null;
  }
) {
  const inRange = (d: Date | string) => {
    const t = new Date(d).getTime();
    return t >= rangeStart.getTime() && t <= rangeEnd.getTime();
  };

  const months = monthsBetween(rangeStart, rangeEnd);

  const [dmSent, umamiVisits, reelsRecords] = await Promise.all([
    getPrisma().manychatDmEvent.count({ where: { triggeredAt: { gte: rangeStart, lte: rangeEnd } } }),
    fetchUmamiVisits(rangeStart.getTime(), rangeEnd.getTime(), data.umamiToken),
    getPrisma().reelsMonthlyView.findMany({ where: { month: { in: months } } }),
  ]);

  const upcomingR = data.upcoming.filter((b) => inRange(b.start as string));
  const pastR = data.past.filter((b) => inRange(b.start as string));
  const cancelledR = data.cancelled.filter((b) => inRange(b.start as string));
  const rejectedR = data.rejected.filter((b) => inRange(b.start as string));

  // Seuls les calls marqués "showed" dans CallReview comptent comme réalisés
  const showedIds = new Set(
    data.reviews.filter((r) => r.status === "showed").map((r) => r.bookingId)
  );
  const callsBooked = upcomingR.length + pastR.length;
  const callsDone = pastR.filter((b) => showedIds.has(b.id as number)).length;
  const noShows = cancelledR.length + rejectedR.length;

  // Taux de présence RÉEL : showed / (showed + noshow) parmi les calls passés
  // de la période, en excluant les calls à venir et les annulés — même formule
  // que l'onglet Calendrier, pour éviter d'afficher deux chiffres différents.
  const pastIdsInRange = new Set(pastR.map((b) => b.id as number));
  const reviewsInRange = data.reviews.filter((r) => pastIdsInRange.has(r.bookingId));
  const showedInRange = reviewsInRange.filter((r) => r.status === "showed").length;
  const noshowInRange = reviewsInRange.filter((r) => r.status === "noshow").length;
  const showRateRelevant = showedInRange + noshowInRange;
  const showRate = showRateRelevant > 0 ? Math.round((showedInRange / showRateRelevant) * 100) : null;

  const clientsInRange = data.clients.filter((c) => inRange(c.clientSince ?? c.createdAt));
  const reelsViews = reelsRecords.reduce((sum, r) => sum + r.views, 0);

  return {
    reelsViews,
    dmSent,
    siteVisits: umamiVisits,
    callsBooked,
    callsDone,
    noShows,
    showRate,
    clients: clientsInRange.length,
    clientsInRange,
    pastR,
    upcomingR,
    reelsRecords,
    months,
  };
}

export async function GET(req: Request) {
  try {
    const now = new Date();
    const url = new URL(req.url);

    // Plage courante : défaut = mois en cours
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const rangeStart = fromParam ? new Date(fromParam + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1);
    const rangeEnd = toParam ? new Date(toParam + "T23:59:59") : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Période précédente : même durée, juste avant
    const durationMs = rangeEnd.getTime() - rangeStart.getTime();
    const prevEnd = new Date(rangeStart.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durationMs);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Données brutes partagées (une seule fois pour les deux périodes)
    const [upcoming, past, cancelled, rejected, clientsRaw, allProspects, snapshots, umamiToken, reviewsRaw] =
      await Promise.all([
        fetchCalBookings("upcoming", 100),
        fetchCalBookings("past", 100),
        fetchCalBookings("cancelled", 100),
        fetchCalBookings("rejected", 100),
        getPrisma().prospect.findMany({
          where: { stage: "client" },
          orderBy: { createdAt: "desc" },
          select: { clientSince: true, createdAt: true, calBookingUid: true, email: true },
        }),
        getPrisma().prospect.findMany({ select: { stage: true, source: true, createdAt: true } }),
        getPrisma().instagramSnapshot.findMany({
          where: { createdAt: { gte: thirtyDaysAgo } },
          orderBy: { createdAt: "asc" },
          select: { followers: true, createdAt: true },
        }),
        getUmamiToken(),
        getPrisma().callReview.findMany({ select: { bookingId: true, status: true } }),
      ]);

    const clients = clientsRaw as ClientRow[];
    const reviews = reviewsRaw as ReviewRow[];
    const shared = { upcoming, past, cancelled, rejected, clients, reviews, umamiToken };

    // Calcul des deux périodes
    const [cur, prev] = await Promise.all([
      computeFunnel(rangeStart, rangeEnd, shared),
      computeFunnel(prevStart, prevEnd, shared),
    ]);

    // Valeur business (CA) des clients signés sur la période courante
    const clientEmails = cur.clientsInRange.map((c) => c.email);
    const businessInfos = clientEmails.length > 0
      ? await getPrisma().clientBusinessInfo.findMany({
          where: { clientEmail: { in: clientEmails } },
          select: { clientEmail: true, dealAmount: true },
        })
      : [];
    const totalRevenue = businessInfos.reduce((sum, b) => sum + (b.dealAmount ?? 0), 0);
    const avgDealSize = cur.clients > 0 ? Math.round(totalRevenue / cur.clients) : 0;

    // Vélocité : temps moyen entre le call réservé et la signature (en jours)
    const uidToCallDate = new Map<string, string>();
    for (const b of [...cur.pastR, ...cur.upcomingR]) {
      uidToCallDate.set(b.uid as string, b.start as string);
    }
    const velocityDays: number[] = [];
    for (const c of cur.clientsInRange) {
      if (c.calBookingUid && c.clientSince && uidToCallDate.has(c.calBookingUid)) {
        const callDate = new Date(uidToCallDate.get(c.calBookingUid)!).getTime();
        const signDate = new Date(c.clientSince).getTime();
        const days = (signDate - callDate) / (1000 * 60 * 60 * 24);
        if (days >= 0 && days < 365) velocityDays.push(days);
      }
    }
    const avgVelocity = velocityDays.length > 0
      ? Math.round(velocityDays.reduce((a, b) => a + b, 0) / velocityDays.length)
      : null;

    // Calls par source → croisement clients CRM (période courante)
    const callSourceMap: Record<string, { calls: number; uids: Set<string> }> = {};
    for (const b of [...cur.pastR, ...cur.upcomingR]) {
      const title = (b.title as string) ?? "Direct";
      const key = title.length > 60 ? title.slice(0, 60) + "…" : title;
      if (!callSourceMap[key]) callSourceMap[key] = { calls: 0, uids: new Set() };
      callSourceMap[key].calls += 1;
      callSourceMap[key].uids.add(b.uid as string);
    }
    const clientUids = new Set(clients.map((c) => c.calBookingUid).filter(Boolean));
    const callSourcesWithClients = Object.entries(callSourceMap)
      .map(([source, d]) => ({
        source,
        calls: d.calls,
        clients: [...d.uids].filter((uid) => clientUids.has(uid)).length,
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 5);

    const prospectsInRange = allProspects.filter((p) => {
      const t = new Date(p.createdAt).getTime();
      return t >= rangeStart.getTime() && t <= rangeEnd.getTime();
    });

    const followersHistory = snapshots.map((s) => ({
      date: s.createdAt.toISOString().slice(0, 10),
      followers: s.followers,
    }));

    const months = cur.months;
    const reelsMonthsWithData = cur.reelsRecords.map((r) => r.month);
    const reelsMissingMonths = months.filter((m) => !reelsMonthsWithData.includes(m));

    return NextResponse.json({
      funnel: {
        reelsViews: cur.reelsViews,
        dmSent: cur.dmSent,
        siteVisits: cur.siteVisits,
        callsBooked: cur.callsBooked,
        callsDone: cur.callsDone,
        clients: cur.clients,
      },
      // Période précédente (pour comparaisons et hover)
      previous: {
        reelsViews: prev.reelsViews,
        dmSent: prev.dmSent,
        siteVisits: prev.siteVisits,
        callsBooked: prev.callsBooked,
        callsDone: prev.callsDone,
        clients: prev.clients,
      },
      previousRange: { from: prevStart.toISOString().slice(0, 10), to: prevEnd.toISOString().slice(0, 10) },
      monthly: {
        calls: cur.callsBooked,
        clients: cur.clients,
        prospects: prospectsInRange.length,
        dmSent: cur.dmSent,
        siteVisits: cur.siteVisits,
      },
      business: {
        totalRevenue,
        avgDealSize,
        avgVelocityDays: avgVelocity,
      },
      callSources: callSourcesWithClients,
      followersHistory,
      noShows: cur.noShows,
      showRate: cur.showRate,
      totalCallsDone: cur.callsDone,
      reelsMonthsWithData,
      reelsMissingMonths,
      reelsMonthlyRecords: cur.reelsRecords.map((r) => ({ month: r.month, views: r.views })),
      range: { from: rangeStart.toISOString().slice(0, 10), to: rangeEnd.toISOString().slice(0, 10) },
      coveredMonths: months,
      hasPlausible: !!process.env.PLAUSIBLE_API_KEY,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
