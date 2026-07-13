export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

// Étapes de l'entonnoir principal, dans l'ordre (cumulatif).
// "individual" (particulier) n'est PAS dans l'entonnoir : c'est une sortie qualifiée après le guide.
const STAGE_ORDER = ["comment", "dm", "subscribed", "email_captured", "guide_sent", "company", "call_booked", "call_done", "client"] as const;
type Stage = (typeof STAGE_ORDER)[number];

// Segment de qualification
type Segment = "company" | "individual" | null;

interface Journey {
  key: string;              // clé d'identité (email si dispo, sinon handle)
  handle: string | null;
  name: string | null;
  email: string | null;
  linkedManually: boolean;  // email relié via AcquisitionLink
  firstVideo: string | null;   // vidéo qui l'a fait entrer
  firstVideoFlow: string | null;
  events: { type: string; flow: string | null; video: string | null; at: string }[];
  firstTouchAt: string | null;
  callBookedAt: string | null;
  clientSince: string | null;
  stage: Stage;
  segment: Segment;         // entreprise / particulier / pas encore qualifié
  daysToCall: number | null;   // délai 1er contact → call réservé
  dealAmount: number | null;
}

function daysBetween(a: string | Date, b: string | Date): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

// Calcule les agrégats (funnel, vidéos, délais) pour un ensemble de parcours.
function computeAggregates(journeys: Journey[]) {
  const funnel: Record<Stage, number> = {
    comment: 0, dm: 0, subscribed: 0, email_captured: 0, guide_sent: 0, company: 0, call_booked: 0, call_done: 0, client: 0,
  };
  const companyIdx = STAGE_ORDER.indexOf("company");
  for (const j of journeys) {
    let idx = STAGE_ORDER.indexOf(j.stage);
    if (j.segment === "individual") idx = Math.min(idx, companyIdx - 1);
    for (let i = 0; i <= idx; i++) funnel[STAGE_ORDER[i]]++;
  }

  const individualsCount = journeys.filter((j) => j.segment === "individual").length;

  const byVideo = new Map<string, { flow: string; label: string; people: number; companies: number; calls: number; clients: number; revenue: number }>();
  for (const j of journeys) {
    const flow = j.firstVideoFlow;
    if (!flow) continue;
    if (!byVideo.has(flow)) byVideo.set(flow, { flow, label: j.firstVideo ?? flow, people: 0, companies: 0, calls: 0, clients: 0, revenue: 0 });
    const v = byVideo.get(flow)!;
    v.people++;
    if (j.segment === "company") v.companies++;
    if (["call_booked", "call_done", "client"].includes(j.stage)) v.calls++;
    if (j.stage === "client") { v.clients++; v.revenue += j.dealAmount ?? 0; }
  }
  const videos = [...byVideo.values()].sort((a, b) => b.clients - a.clients || b.calls - a.calls || b.companies - a.companies || b.people - a.people);

  const delays = journeys.map((j) => j.daysToCall).filter((d): d is number => d !== null);
  const avgDaysToCall = delays.length ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : null;

  return {
    funnel, individualsCount, videos, avgDaysToCall,
    totalPeople: journeys.length,
    clients: funnel.client,
    calls: funnel.call_booked,
  };
}

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma();
    const url = new URL(req.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    const [events, links, prospects, businessInfos] = await Promise.all([
      prisma.manychatEvent.findMany({ orderBy: { occurredAt: "asc" } }),
      prisma.acquisitionLink.findMany(),
      prisma.prospect.findMany({
        select: { name: true, email: true, stage: true, clientSince: true, stageUpdatedAt: true, createdAt: true, calBookingUid: true },
      }),
      prisma.clientBusinessInfo.findMany({ select: { clientEmail: true, dealAmount: true } }),
    ]);

    // handle → email (liens manuels)
    const handleToEmail = new Map(links.map((l) => [l.handle.toLowerCase(), l.email.toLowerCase()]));
    // email → prospect
    const prospectByEmail = new Map(prospects.map((p) => [p.email.toLowerCase(), p]));
    const dealByEmail = new Map(businessInfos.map((b) => [b.clientEmail.toLowerCase(), b.dealAmount]));

    // Regroupe les événements par identité. Le handle ManyChat est la clé stable
    // (une même personne peut changer/corriger son email en cours de route) :
    // on fusionne d'abord par handle, puis on rattache l'email le plus récent connu.
    // Si un événement n'a pas de handle (ex: lien manuel côté email seul), on retombe sur l'email.
    const handleGroups = new Map<string, typeof events>();
    const emailOnlyGroups = new Map<string, typeof events>();
    for (const e of events) {
      const handleKey = e.handle?.toLowerCase() ?? null;
      const emailKey = e.email?.toLowerCase() ?? null;
      if (handleKey) {
        if (!handleGroups.has(handleKey)) handleGroups.set(handleKey, []);
        handleGroups.get(handleKey)!.push(e);
      } else if (emailKey) {
        if (!emailOnlyGroups.has(emailKey)) emailOnlyGroups.set(emailKey, []);
        emailOnlyGroups.get(emailKey)!.push(e);
      }
    }
    const groups = new Map<string, typeof events>();
    for (const [handleKey, evs] of handleGroups) groups.set(handleKey, evs);
    for (const [emailKey, evs] of emailOnlyGroups) {
      // Si cet email correspond à un handle déjà regroupé (via lien manuel), on fusionne dedans
      const linkedHandle = [...handleToEmail.entries()].find(([, em]) => em === emailKey)?.[0];
      if (linkedHandle && groups.has(linkedHandle)) {
        groups.get(linkedHandle)!.push(...evs);
      } else {
        groups.set(emailKey, evs);
      }
    }

    const journeys: Journey[] = [];
    for (const [key, evs] of groups) {
      const sorted = evs.slice().sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
      const first = sorted[0];

      // Résout l'identité consolidée. On prend le DERNIER email/nom connu (le plus
      // récent) : si la personne corrige son email en cours de route, on garde le bon.
      const handle = sorted.find((e) => e.handle)?.handle ?? null;
      const name = [...sorted].reverse().find((e) => e.name)?.name ?? null;
      const directEmail = [...sorted].reverse().find((e) => e.email)?.email?.toLowerCase() ?? null;
      const linkedEmail = handle ? handleToEmail.get(handle.toLowerCase()) ?? null : null;
      const email = directEmail ?? linkedEmail ?? null;
      const linkedManually = !directEmail && !!linkedEmail;

      const prospect = email ? prospectByEmail.get(email) ?? null : null;

      // Détermine le stage atteint (on avance au plus loin franchi)
      const types = new Set(sorted.map((e) => e.eventType));
      let stage: Stage = "comment";
      if (types.has("comment")) stage = "comment";
      if (types.has("dm")) stage = "dm";
      if (types.has("subscribed")) stage = "subscribed";
      if (types.has("email_captured") || email) stage = "email_captured";
      if (types.has("guide_sent")) stage = "guide_sent";

      // Segment de qualification : entreprise fait avancer, particulier = sortie
      let segment: Segment = null;
      if (types.has("individual")) segment = "individual";
      if (types.has("company")) { segment = "company"; stage = "company"; }

      let callBookedAt: string | null = null;
      let clientSince: string | null = null;
      if (prospect) {
        if (["call_booked", "call_done", "proposal_sent", "client"].includes(prospect.stage)) {
          stage = "call_booked";
          if (segment !== "individual") segment = "company"; // un call implique une cible entreprise
          callBookedAt = (prospect.stageUpdatedAt ?? prospect.createdAt)?.toISOString() ?? null;
        }
        if (["call_done", "proposal_sent", "client"].includes(prospect.stage)) stage = "call_done";
        if (prospect.stage === "client") {
          stage = "client";
          clientSince = prospect.clientSince?.toISOString() ?? null;
        }
      }

      const firstTouchAt = first.occurredAt.toISOString();
      const daysToCall = callBookedAt ? daysBetween(firstTouchAt, callBookedAt) : null;

      journeys.push({
        key,
        handle,
        name: name ?? prospect?.name ?? null,
        email,
        linkedManually,
        firstVideo: first.videoLabel,
        firstVideoFlow: first.flowName,
        events: sorted.map((e) => ({ type: e.eventType, flow: e.flowName, video: e.videoLabel, at: e.occurredAt.toISOString() })),
        firstTouchAt,
        callBookedAt,
        clientSince,
        stage,
        segment,
        daysToCall: daysToCall !== null && daysToCall >= 0 ? daysToCall : null,
        dealAmount: email ? dealByEmail.get(email) ?? null : null,
      });
    }

    journeys.sort((a, b) => new Date(b.firstTouchAt ?? 0).getTime() - new Date(a.firstTouchAt ?? 0).getTime());

    // Filtrage par cohorte : on segmente sur la DATE DU 1ER CONTACT.
    // Période courante (défaut = tout) + période précédente de même durée pour comparaison.
    const rangeStart = fromParam ? new Date(fromParam + "T00:00:00").getTime() : null;
    const rangeEnd = toParam ? new Date(toParam + "T23:59:59").getTime() : null;
    const inRange = (iso: string | null) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      if (rangeStart !== null && t < rangeStart) return false;
      if (rangeEnd !== null && t > rangeEnd) return false;
      return true;
    };

    const current = (rangeStart !== null || rangeEnd !== null)
      ? journeys.filter((j) => inRange(j.firstTouchAt))
      : journeys;

    // Période précédente : même durée, juste avant
    let previousAgg: ReturnType<typeof computeAggregates> | null = null;
    let previousRange: { from: string; to: string } | null = null;
    if (rangeStart !== null && rangeEnd !== null) {
      const duration = rangeEnd - rangeStart;
      const prevEnd = rangeStart - 1;
      const prevStart = prevEnd - duration;
      const prev = journeys.filter((j) => {
        if (!j.firstTouchAt) return false;
        const t = new Date(j.firstTouchAt).getTime();
        return t >= prevStart && t <= prevEnd;
      });
      previousAgg = computeAggregates(prev);
      previousRange = {
        from: new Date(prevStart).toISOString().slice(0, 10),
        to: new Date(prevEnd).toISOString().slice(0, 10),
      };
    }

    const agg = computeAggregates(current);

    // Prospects à relancer : bloqués à une étape depuis un moment, pas encore convertis.
    // On regarde le dernier événement de chaque parcours et son ancienneté.
    const now = Date.now();
    const STALE_DAYS = 4; // seuil de relance
    const toFollowUp = current
      .filter((j) => {
        // pas encore de call ni client → cible de relance
        if (["call_booked", "call_done", "client"].includes(j.stage)) return false;
        if (j.segment === "individual") return false; // particulier écarté, pas de relance
        const lastEvent = j.events[j.events.length - 1];
        if (!lastEvent) return false;
        const daysSince = Math.floor((now - new Date(lastEvent.at).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince >= STALE_DAYS;
      })
      .map((j) => {
        const lastEvent = j.events[j.events.length - 1];
        const daysSince = Math.floor((now - new Date(lastEvent.at).getTime()) / (1000 * 60 * 60 * 24));
        return {
          key: j.key, handle: j.handle, name: j.name, email: j.email,
          stage: j.stage, firstVideo: j.firstVideo, daysSinceLastEvent: daysSince,
        };
      })
      .sort((a, b) => b.daysSinceLastEvent - a.daysSinceLastEvent);

    // Personnes non reliées (handle sans email) → candidates au lien manuel
    const unlinked = current.filter((j) => !j.email && j.handle).map((j) => ({ key: j.key, handle: j.handle, name: j.name, firstVideo: j.firstVideo }));

    return NextResponse.json({
      journeys: current,
      funnel: agg.funnel,
      individualsCount: agg.individualsCount,
      videos: agg.videos,
      avgDaysToCall: agg.avgDaysToCall,
      totalPeople: agg.totalPeople,
      previous: previousAgg
        ? { funnel: previousAgg.funnel, totalPeople: previousAgg.totalPeople, clients: previousAgg.clients, calls: previousAgg.calls, individualsCount: previousAgg.individualsCount }
        : null,
      previousRange,
      toFollowUp,
      unlinked,
      range: (rangeStart !== null && rangeEnd !== null) ? { from: fromParam, to: toParam } : null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — crée un lien manuel handle → email
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const handle = (body.handle as string | undefined)?.trim().replace(/^@/, "");
    const email = (body.email as string | undefined)?.trim().toLowerCase();
    if (!handle || !email) {
      return NextResponse.json({ error: "handle et email requis" }, { status: 400 });
    }
    const link = await getPrisma().acquisitionLink.upsert({
      where: { handle },
      update: { email, note: body.note ?? null },
      create: { handle, email, note: body.note ?? null },
    });
    return NextResponse.json({ ok: true, link });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE ?handle=xxx — supprime un lien manuel
export async function DELETE(req: NextRequest) {
  try {
    const handle = new URL(req.url).searchParams.get("handle")?.replace(/^@/, "");
    if (!handle) return NextResponse.json({ error: "handle requis" }, { status: 400 });
    await getPrisma().acquisitionLink.delete({ where: { handle } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
