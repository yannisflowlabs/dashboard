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

async function fetchUmamiVisits(): Promise<{ total: number; thisMonth: number }> {
  try {
    if (!UMAMI_PASS) return { total: 0, thisMonth: 0 };

    const authRes = await fetch(`${UMAMI_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: UMAMI_USER, password: UMAMI_PASS }),
    });
    if (!authRes.ok) return { total: 0, thisMonth: 0 };
    const { token } = await authRes.json() as { token: string };

    const now = Date.now();
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

    const [totalRes, monthRes] = await Promise.all([
      fetch(`${UMAMI_URL}/api/websites/${UMAMI_WEBSITE_ID}/stats?startAt=${oneYearAgo}&endAt=${now}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${UMAMI_URL}/api/websites/${UMAMI_WEBSITE_ID}/stats?startAt=${startOfMonth}&endAt=${now}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    if (!totalRes.ok || !monthRes.ok) return { total: 0, thisMonth: 0 };

    const totalData = await totalRes.json() as { visits?: number };
    const monthData = await monthRes.json() as { visits?: number };

    return {
      total: totalData.visits ?? 0,
      thisMonth: monthData.visits ?? 0,
    };
  } catch {
    return { total: 0, thisMonth: 0 };
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

export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Cal.com + Prisma + Umami en parallèle
    const [upcoming, past, cancelled, rejected, clients, allProspects, igCache, snapshots, dmTotal, dmThisMonth, umamiVisits] =
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
        getPrisma().manychatDmEvent.count(),
        getPrisma().manychatDmEvent.count({ where: { triggeredAt: { gte: startOfMonth } } }),
        fetchUmamiVisits(),
      ]);

    // Stats calls
    const totalCallsBooked = upcoming.length + past.length;
    const totalCallsDone = past.length;
    const noShows = cancelled.length + rejected.length;
    const callsThisMonth = [...upcoming, ...past].filter(
      (b) => new Date(b.start as string) >= startOfMonth
    ).length;

    // Calls par source → croisement clients CRM
    const callSourceMap: Record<string, { calls: number; uids: Set<string> }> = {};
    for (const b of [...past, ...upcoming]) {
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

    // Instagram
    let reelsViews = 0;
    if (igCache) {
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

    const clientsThisMonth = clients.filter((c) => new Date(c.updatedAt) >= startOfMonth).length;
    const prospectsThisMonth = allProspects.filter((p) => new Date(p.createdAt) >= startOfMonth).length;

    return NextResponse.json({
      funnel: {
        reelsViews,
        dmSent: dmTotal,
        siteVisits: umamiVisits.total,
        callsBooked: totalCallsBooked,
        clients: clients.length,
      },
      monthly: {
        calls: callsThisMonth,
        clients: clientsThisMonth,
        prospects: prospectsThisMonth,
        dmSent: dmThisMonth,
        siteVisits: umamiVisits.thisMonth,
      },
      callSources: callSourcesWithClients,
      followersHistory,
      noShows,
      totalCallsDone,
      hasPlausible: !!process.env.PLAUSIBLE_API_KEY,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
