export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `Tu es un assistant qui analyse des transcripts d'appels commerciaux/clients pour Flow Labs (agence IA).
À partir du transcript fourni, produis un résumé structuré en français avec ces sections (utilise du markdown) :

## Résumé en 5 points
1. (point clé 1)
2. (point clé 2)
3. (point clé 3)
4. (point clé 4)
5. (point clé 5)

## Besoins du client
- (ce dont le client a besoin)

## Objections / points de vigilance
- (freins, doutes, risques identifiés)

## Budget / deal
- (tout ce qui touche au montant, timing, décision — ou "Non abordé")

## Prochaines étapes
- (ce qui a été convenu)

Puis, à la toute fin, ajoute une ligne exactement au format :
ACTIONS: action 1 | action 2 | action 3
(les tâches concrètes à faire côté Flow Labs, séparées par des barres verticales. Si aucune, écris "ACTIONS:")`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const callId = Number(body?.callId);
    if (!callId) return NextResponse.json({ error: "callId requis" }, { status: 400 });

    const call = await getPrisma().clientCall.findUnique({ where: { id: callId } });
    if (!call) return NextResponse.json({ error: "Call introuvable" }, { status: 404 });
    if (!call.transcriptText) {
      return NextResponse.json({ error: "Aucun transcript disponible pour ce call" }, { status: 400 });
    }

    // Clé Claude absente → on le signale clairement sans casser l'app
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Génération IA non activée — ajoute ANTHROPIC_API_KEY dans les variables d'environnement." },
        { status: 503 }
      );
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Transcript de l'appel :\n\n${call.transcriptText}` }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Erreur API Claude : ${errText}` }, { status: 502 });
    }

    const data = (await res.json()) as { content: { text: string }[] };
    const fullText = data.content?.[0]?.text ?? "";

    // Sépare les notes de la ligne ACTIONS ([\s\S] évite le flag /s non supporté par la cible TS)
    const actionsMatch = fullText.match(/ACTIONS:\s*([\s\S]*)$/);
    const notes = fullText.replace(/ACTIONS:[\s\S]*$/, "").trim();
    const actionLabels = actionsMatch
      ? actionsMatch[1].split("|").map((a) => a.trim()).filter((a) => a.length > 0)
      : [];

    // Sauvegarde les notes
    await getPrisma().clientCall.update({ where: { id: callId }, data: { notes } });

    // Crée les actions extraites
    if (actionLabels.length > 0) {
      await getPrisma().clientAction.createMany({
        data: actionLabels.map((label) => ({ clientEmail: call.clientEmail, label, callId })),
      });
    }

    return NextResponse.json({ notes, actionsCreated: actionLabels.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
