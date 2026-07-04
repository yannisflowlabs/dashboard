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

// Visites Umami sur une plage de dates précise
async function fetchUmamiVisits(startAt: number, endAt: number): Promise<number> {
  try {
    if (!UMAMI_PASS) return 0;

    const authRes = await fetch(`${UMAMI_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: UMAMI_USER, password: UMAMI_PASS }),
    });
    if (!authRes.ok) return 0;
    const { token } = await authRes.json() as { token: string };

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

export async function GET(req: Request) {
  try {
    const now = new Date();
    const url = new URL(req.url);

    // Plage de dates : défaut = mois en cours
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const rangeStart = fromParam ? new Date(fromParam + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1);
    const rangeEnd = toParam ? new Date(toParam + "T23:59:59") : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const inRange = (d: Date | string) => {
      const t = new Date(d).getTime();
      return t >= rangeStart.getTime() && t <= rangeEnd.getTime();
    };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Cal.com + Prisma + Umami en parallèle
    // Calcul des mois couverts par la plage (pour agréger les vues Reels mensuelles)
    const coveredMonths: string[] = [];
    const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (cursor <= rangeEnd) {
      coveredMonths.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const [upcoming, past, cancelled, rejected, clients, allProspects, igCache, snapshots, dmInRange, umamiVisitsRange, reelsMonthlyRecords] =
      await Promise.all([
        fetchCalBookings("upcoming", 100),
        fetchCalBookings("past", 100),
        fetchCalBookings("cancelled", 100),
        fetchCalBookings("rejected", 100),
        getPrisma().prospect.findMany({ where: { stage: "client" }, orderBy: { createdAt: "desc" } }),
        getPrisma().prospect.findMany({ select: { stage: true, source: true, createdAt: true } }),
        getPrisma().instagramCache.findUnique({ where: { id: 1 } }),
        getPrisma().instagramSnapshot.findMany({
          where: { createdAt: { gte: thirtyDaysAgo } },
          orderBy: { createdAt: "asc" },
          select: { followers: true, createdAt: true },
        }),
        getPrisma().manychatDmEvent.count({ where: { triggeredAt: { gte: rangeStart, lte: rangeEnd } } }),
        fetchUmamiVisits(rangeStart.getTime(), rangeEnd.getTime()),
        getPrisma().reelsMonthlyView.findMany({ where: { month: { in: coveredMonths } } }),
      ]);

    // Calls filtrés sur la plage (par date de début du call)
    const upcomingR = upcoming.filter((b) => inRange(b.start as string));
    const pastR = past.filter((b) => inRange(b.start as string));
    const cancelledR = cancelled.filter((b) => inRange(b.start as string));
    const rejectedR = rejected.filter((b) => inRange(b.start as string));

    // Stats calls (sur la plage)
    const totalCallsBooked = upcomingR.length + pastR.length;
    const totalCallsDone = pastR.length;
    const noShows = cancelledR.length + rejectedR.length;

    // Clients & prospects sur la plage (filtrés sur createdAt — date d'entrée dans le CRM)
    const clientsInRange = clients.filter((c) => inRange(c.createdAt));
    const prospectsInRange = allProspects.filter((p) => inRange(p.createdAt));

    // Calls par source → croisement clients CRM (sur la plage)
    const callSourceMap: Record<string, { calls: number; uids: Set<string> }> = {};
    for (const b of [...pastR, ...upcomingR]) {
      const title = (b.title as string) ?? "Direct";
      const key = title.length > 60 ? title.slice(0, 60) + "…" : title;
      if (!callSourceMap[key]) callSourceMap[key] = { calls: 0, uids: new Set() };
      callSourceMap[key].calls += 1;
      callSourceMap[key].uids.add(b.uid as string);
    }
    const clientUids = new Set(clients.map((c) => c.calBookingUid).filter(Boolean));
    const callSourcesWithClients = Object.entries(callSourceMap)
      .map(([source, data]) => ({
        source,
        calls: data.calls,
        clients: [...data.uids].filter((uid) => clientUids.has(uid)).length,
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 5);

    // Vues Reels : somme des mois couverts (saisie manuelle par mois)
    const reelsViews = reelsMonthlyRecords.reduce((sum, r) => sum + r.views, 0);
    // Mois avec données saisies (pour affichage dans le frontend)
    const reelsMonthsWithData = reelsMonthlyRecords.map((r) => r.month);
    // Mois de la plage sans données (pour alerter l'utilisateur)
    const reelsMissingMonths = coveredMonths.filter((m) => !reelsMonthsWithData.includes(m));

    const followersHistory = snapshots.map((s) => ({
      date: s.createdAt.toISOString().slice(0, 10),
      followers: s.followers,
    }));

    return NextResponse.json({
      funnel: {
        // reelsViews = compteur cumulé (saisie manuelle, pas d'historique daté)
        reelsViews,
        dmSent: dmInRange,
        siteVisits: umamiVisitsRange,
        callsBooked: totalCallsBooked,
        clients: clientsInRange.length,
      },
      monthly: {
        calls: totalCallsBooked,
        clients: clientsInRange.length,
        prospects: prospectsInRange.length,
        dmSent: dmInRange,
        siteVisits: umamiVisitsRange,
      },
      callSources: callSourcesWithClients,
      followersHistory,
      noShows,
      totalCallsDone,
      reelsMonthsWithData,
      reelsMissingMonths,
      reelsMonthlyRecords: reelsMonthlyRecords.map((r) => ({ month: r.month, views: r.views })),
      range: { from: rangeStart.toISOString().slice(0, 10), to: rangeEnd.toISOString().slice(0, 10) },
      coveredMonths,
      hasPlausible: !!process.env.PLAUSIBLE_API_KEY,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
