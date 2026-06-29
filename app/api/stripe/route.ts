export const dynamic = "force-dynamic";
import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthTs = Math.floor(startOfMonth.getTime() / 1000);

    // Paiements du mois en cours
    const charges = await stripe.charges.list({
      created: { gte: startOfMonthTs },
      limit: 100,
    });

    const monthlyRevenue = charges.data
      .filter((c) => c.status === "succeeded" && !c.refunded)
      .reduce((sum, c) => sum + c.amount, 0) / 100;

    // Historique des 20 derniers paiements
    const recent = await stripe.charges.list({ limit: 20 });
    const transactions = recent.data
      .filter((c) => c.status === "succeeded")
      .map((c) => ({
        id: c.id,
        date: new Date(c.created * 1000).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        description: c.description || "Paiement",
        customer: c.billing_details?.name || c.customer?.toString() || "—",
        amount: c.amount / 100,
        currency: c.currency.toUpperCase(),
      }));

    // MRR via subscriptions actives
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
    });

    const mrr = subscriptions.data.reduce((sum, sub) => {
      const item = sub.items.data[0];
      if (!item) return sum;
      const price = item.price;
      const amount = (price.unit_amount ?? 0) / 100;
      if (price.recurring?.interval === "month") return sum + amount;
      if (price.recurring?.interval === "year") return sum + amount / 12;
      return sum;
    }, 0);

    // Revenus des 6 derniers mois
    const monthlyHistory: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = Math.floor(d.getTime() / 1000);
      const end = Math.floor(new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() / 1000);
      const label = d.toLocaleDateString("fr-FR", { month: "short" });
      const ch = await stripe.charges.list({ created: { gte: start, lt: end }, limit: 100 });
      const total = ch.data
        .filter((c) => c.status === "succeeded" && !c.refunded)
        .reduce((s, c) => s + c.amount, 0) / 100;
      monthlyHistory.push({ label, value: total });
    }

    // Balance disponible
    const balance = await stripe.balance.retrieve();
    const available = balance.available.reduce((s, b) => s + b.amount, 0) / 100;

    return NextResponse.json({
      monthlyRevenue,
      mrr,
      available,
      transactions,
      monthlyHistory,
      activeSubscriptions: subscriptions.data.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur Stripe inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
