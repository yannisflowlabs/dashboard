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
    const [upcoming, past, cancelled, rejected, clients, allProspects, igCache, snapshots, dmInRange, umamiVisitsRange, reelsViewsMetric] =
      await Promise.all([
        fetchCalBookings("upcoming", 100),
        fetchCalBookings("past", 100),
        fetchCalBookings("cancelled", 100),
        fetchCalBookings("rejected", 100),
        getPrisma().prospect.findMany({ where: { stage: "client" }, orderBy: { updatedAt: "desc" } }),
        getPrisma().prospect.findMany({ select: { stage: true, source: true, createdAt: true } }),
        getPrisma().instagramCache.findUnique({ where: { id: 1 } }),
        getPrisma().instagramSnapshot.findMany({
          where: { createdAt: { gte: thirtyDaysAgo } },
          orderBy: { createdAt: "asc" },
          select: { followers: true, createdAt: true },
        }),
        getPrisma().manychatDmEvent.count({ where: { triggeredAt: { gte: rangeStart, lte: rangeEnd } } }),
        fetchUmamiVisits(rangeStart.getTime(), rangeEnd.getTime()),
        getPrisma().manualMetric.findUnique({ where: { key: "reelsViews" } }),
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

    // Clients & prospects sur la plage
    const clientsInRange = clients.filter((c) => inRange(c.updatedAt));
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

    // Instagram — vues Reels : priorité à la saisie manuelle (API Meta bloquée)
    let reelsViews = reelsViewsMetric?.value ?? 0;
    if (reelsViews === 0 && igCache) {
      try {
        const igData = JSON.parse(igCache.data) as { reelsViews?: number; recentPosts?: { type: string; views?: number; plays?: number }[] };
        if (igData.reelsViews) {
          reelsViews = igData.reelsViews;
        } else if (igData.recentPosts) {
          reelsViews = igData.recentPosts
            .filter((p) => p.type === "Video" || p.type === "Reel")
            .reduce((sum, p) => sum + (p.views ?? p.plays ?? 0), 0);
        }
      } catch {
        reelsViews = 0;
      }
    }

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
      reelsIsCumulative: true,
      range: { from: rangeStart.toISOString().slice(0, 10), to: rangeEnd.toISOString().slice(0, 10) },
      hasPlausible: !!process.env.PLAUSIBLE_API_KEY,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
