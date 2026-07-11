export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

// Récupère la 1re valeur non vide parmi plusieurs clés possibles du payload ManyChat
function pick(body: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = body[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

// Dérive un libellé de vidéo lisible depuis le nom du flow ManyChat.
// Ex: "reel-automatisation-mars" → "Reel automatisation mars"
function videoLabelFromFlow(flow: string | null): string | null {
  if (!flow) return null;
  const cleaned = flow.replace(/[-_]+/g, " ").trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const handle = pick(body, ["handle", "ig_username", "username", "instagram", "user_name"])?.replace(/^@/, "") ?? null;
    const name = pick(body, ["name", "full_name", "first_name"]);
    const email = pick(body, ["email", "user_email"])?.toLowerCase() ?? null;
    const contactId = pick(body, ["id", "subscriber_id", "contact_id"]);
    const flowName = pick(body, ["flow_name", "flow", "name_flow"]);
    const eventType = pick(body, ["event_type", "type", "step"]) ?? "dm";
    const utmContent = pick(body, ["utm_content", "utm"]);

    // Nouveau modèle riche : un événement par interaction
    await getPrisma().manychatEvent.create({
      data: {
        contactId,
        handle,
        name,
        email,
        eventType,
        flowName,
        videoLabel: videoLabelFromFlow(flowName),
        utmContent,
        raw: JSON.stringify(body).slice(0, 4000),
        occurredAt: new Date(),
      },
    });

    // Compat : on garde l'ancien compteur agrégé pour le tunnel existant
    await getPrisma().manychatDmEvent.create({
      data: { contactId, flowName },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET pour tester que l'endpoint est vivant
export async function GET() {
  const [events, dmEvents] = await Promise.all([
    getPrisma().manychatEvent.count(),
    getPrisma().manychatDmEvent.count(),
  ]);
  return NextResponse.json({ ok: true, manychatEvents: events, dmEvents });
}
