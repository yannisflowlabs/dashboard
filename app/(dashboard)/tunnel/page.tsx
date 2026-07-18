"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, MessageCircle, PhoneCall, UserCheck, AlertCircle, Wifi, Loader2, Play, Euro, Clock, Target, Lightbulb } from "lucide-react";
import Panel from "@/components/ui/Panel";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import FunnelChartV2, { type FunnelStepV2 } from "@/components/charts/FunnelChartV2";
import PeriodSelector, { currentMonthPeriod, type Period } from "@/components/ui/PeriodSelector";

interface FunnelNums {
  reelsViews: number;
  dmSent: number;
  siteVisits: number | null;
  callsBooked: number;
  callsDone: number;
  clients: number;
}

interface TunnelData {
  funnel: FunnelNums;
  previous: FunnelNums;
  previousRange: { from: string; to: string };
  monthly: {
    calls: number;
    clients: number;
    prospects: number;
    dmSent: number;
  };
  business: {
    totalRevenue: number;
    avgDealSize: number;
    avgVelocityDays: number | null;
  };
  callSources: { source: string; calls: number; clients: number }[];
  followersHistory: { date: string; followers: number }[];
  noShows: number;
  showRate: number | null;
  totalCallsDone: number;
  hasPlausible: boolean;
  updatedAt: string;
  reelsMonthsWithData: string[];
  reelsMissingMonths: string[];
  coveredMonths: string[];
  reelsMonthlyRecords: { month: string; views: number }[];
}

// Petit indicateur de variation vs période précédente
function deltaPct(cur: number, prev: number): number | null {
  if (prev <= 0) return cur > 0 ? 100 : null;
  return Math.round(((cur - prev) / prev) * 100);
}

export default function TunnelPage() {
  const [data, setData] = useState<TunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(currentMonthPeriod());

  // Édition manuelle des vues Reels (API Meta bloquée)
  const [editingReels, setEditingReels] = useState(false);
  const [reelsInput, setReelsInput] = useState("");
  const [savingReels, setSavingReels] = useState(false);
  const [editingMonth, setEditingMonth] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tunnel?from=${period.from}&to=${period.to}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else { setData(d); setError(null); }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [period]);

  function startEditReels(targetMonth?: string) {
    const months = data?.coveredMonths ?? [];
    const missing = data?.reelsMissingMonths ?? [];
    const target = targetMonth ?? missing[0] ?? months[months.length - 1] ?? period.from.slice(0, 7);
    setEditingMonth(target);
    const existing = data?.reelsMonthlyRecords?.find((r) => r.month === target)?.views;
    setReelsInput(existing !== undefined ? String(existing) : "");
    setEditingReels(true);
  }

  async function saveReelsViews() {
    const value = Number(reelsInput.replace(/\s/g, ""));
    if (!Number.isFinite(value) || value < 0) return;
    const month = editingMonth ?? period.from.slice(0, 7);
    setSavingReels(true);
    try {
      await fetch("/api/reels-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, views: value }),
      });
      const res = await fetch(`/api/tunnel?from=${period.from}&to=${period.to}`);
      const d = await res.json();
      if (!d.error) setData(d);
      setEditingReels(false);
      setEditingMonth(null);
    } finally {
      setSavingReels(false);
    }
  }

  const f = data?.funnel;
  const prev = data?.previous;
  const reelsViews = f?.reelsViews ?? 0;
  const dmSent = f?.dmSent ?? 0;
  const siteVisits = f?.siteVisits ?? null;
  const callsBooked = f?.callsBooked ?? 0;
  const callsDone = f?.callsDone ?? 0;
  const clients = f?.clients ?? 0;

  // Étapes de l'entonnoir (6 étapes avec calls réalisés)
  const funnelSteps: FunnelStepV2[] = [
    { key: "views", label: "Vues Reels", value: reelsViews, previous: prev?.reelsViews, color: "#A8C5A0", sub: "saisie manuelle" },
    { key: "dm", label: "DM envoyés", value: dmSent, previous: prev?.dmSent, color: "#C5B8E8", sub: "ManyChat", goal: 100 },
    { key: "site", label: "Visites site", value: siteVisits ?? 0, previous: prev?.siteVisits, color: "#F0C860", sub: "Umami" },
    { key: "booked", label: "Calls réservés", value: callsBooked, previous: prev?.callsBooked, color: "#B8B0E8", sub: "Cal.com", goal: 15 },
    { key: "done", label: "Calls réalisés", value: callsDone, previous: prev?.callsDone, color: "#8F9FE0", sub: "présents" },
    { key: "clients", label: "Clients signés", value: clients, previous: prev?.clients, color: "#E8A090", sub: "CRM", goal: 10 },
  ];

  const globalConv = reelsViews > 0 ? ((clients / reelsViews) * 100).toFixed(3) : "—";
  const callConv = callsBooked > 0 ? Math.round((clients / callsBooked) * 100) : 0;
  // Même formule que l'onglet Calendrier : showed / (showed + noshow), calls passés
  // uniquement (exclut les calls à venir et annulés) — évite d'afficher 2 taux différents.
  const showRate = data?.showRate ?? 0;
  const viewsToDm = reelsViews > 0 && dmSent > 0 ? ((dmSent / reelsViews) * 100).toFixed(1) : null;

  // Deltas vs période précédente
  const dClients = prev ? deltaPct(clients, prev.clients) : null;
  const dCalls = prev ? deltaPct(callsBooked, prev.callsBooked) : null;
  const dDm = prev ? deltaPct(dmSent, prev.dmSent) : null;
  const dReels = prev ? deltaPct(reelsViews, prev.reelsViews) : null;

  const business = data?.business;

  const objectives = [
    { label: "Clients cible (2026)", current: clients, goal: 10, color: "var(--sage)" },
    { label: "Calls cible", current: callsBooked, goal: 15, color: "var(--yellow)" },
    { label: "DM cible", current: dmSent, goal: 100, color: "var(--lavender)" },
  ];

  const updatedLabel = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : null;

  if (loading) {
    return (
      <div style={{ padding: "28px", display: "flex", alignItems: "center", gap: "10px", color: "var(--text-muted)" }}>
        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 14 }}>Chargement du tunnel…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", background: "#FFF0EE", borderRadius: "var(--radius-row)", fontSize: 13, color: "#8B2E22" }}>
          <AlertCircle size={14} />
          Erreur : {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 28px", maxWidth: 1100 }}>
      <PageHeader
        title="Tunnel de conversion"
        subtitle="Vues Reels → DM → Site → Call réservé → Call réalisé → Client"
        action={<PeriodSelector value={period} onChange={setPeriod} />}
      />

      {/* Status bar */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: "#F0F7EF", borderRadius: "var(--radius-row)", fontSize: 12, color: "#2E5E28" }}>
          <Wifi size={12} />
          <span>
            Cal.com · {callsBooked} réservés · {callsDone} réalisés · {clients} clients · {dmSent} DM
            {updatedLabel && ` · ${updatedLabel}`}
          </span>
        </div>
        {(data?.reelsMissingMonths?.length ?? 0) > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: "#F0F5EE", borderRadius: "var(--radius-row)", fontSize: 12, color: "#3E5A38" }}>
            <AlertCircle size={12} />
            <span>
              Vues Reels manquantes pour {data!.reelsMissingMonths.map((m) => new Date(m + "-01T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })).join(", ")} — clique sur «&nbsp;Éditer&nbsp;».
            </span>
          </div>
        )}
      </div>

      {/* KPIs avec deltas vs période précédente */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px", marginBottom: "16px" }}>
        {/* Carte Vues Reels éditable */}
        <div style={{ position: "relative", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
              <Play size={14} /> Vues
            </div>
            {!editingReels && (
              <button onClick={() => startEditReels()} style={{ fontSize: 10, color: "var(--text-muted)", cursor: "pointer", background: "none", border: "none", textDecoration: "underline", padding: 0 }}>
                Éditer
              </button>
            )}
          </div>
          {editingReels ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {editingMonth && (
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "capitalize" }}>
                  {new Date(editingMonth + "-01T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                </div>
              )}
              <input type="number" min={0} autoFocus value={reelsInput}
                onChange={(e) => setReelsInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveReelsViews(); if (e.key === "Escape") { setEditingReels(false); setEditingMonth(null); } }}
                placeholder="Vues"
                style={{ width: "100%", padding: "5px 7px", fontSize: 15, fontWeight: 700, border: "1px solid var(--border)", borderRadius: "var(--radius-row)", outline: "none" }} />
              {(data?.coveredMonths?.length ?? 0) > 1 && (
                <select value={editingMonth ?? ""}
                  onChange={(e) => {
                    const m = e.target.value;
                    setEditingMonth(m);
                    const existing = data?.reelsMonthlyRecords?.find((r) => r.month === m)?.views;
                    setReelsInput(existing !== undefined ? String(existing) : "");
                  }}
                  style={{ padding: "4px 6px", fontSize: 11, border: "1px solid var(--border)", borderRadius: "var(--radius-row)", fontFamily: "inherit" }}>
                  {data?.coveredMonths.map((m) => (
                    <option key={m} value={m}>
                      {new Date(m + "-01T12:00:00").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })}
                      {data.reelsMonthsWithData.includes(m) ? " ✓" : " ⚠"}
                    </option>
                  ))}
                </select>
              )}
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={saveReelsViews} disabled={savingReels}
                  style={{ flex: 1, padding: "4px", fontSize: 11, fontWeight: 600, cursor: "pointer", background: "#A8C5A0", color: "#1a2e1a", border: "none", borderRadius: "var(--radius-row)", opacity: savingReels ? 0.6 : 1 }}>
                  {savingReels ? "..." : "OK"}
                </button>
                <button onClick={() => { setEditingReels(false); setEditingMonth(null); }}
                  style={{ padding: "4px 8px", fontSize: 11, cursor: "pointer", background: "none", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-row)" }}>
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px" }}>
                {reelsViews > 0 ? reelsViews.toLocaleString("fr-FR") : "—"}
              </div>
              <DeltaBadge delta={dReels} />
            </>
          )}
        </div>

        <MiniKpi label="DM" value={dmSent} icon={<MessageCircle size={14} />} delta={dDm} />
        <MiniKpi label="Visites" value={siteVisits ?? 0} icon={<TrendingUp size={14} />} />
        <MiniKpi label="Calls réservés" value={callsBooked} icon={<PhoneCall size={14} />} delta={dCalls} />
        <MiniKpi label="Calls réalisés" value={callsDone} icon={<PhoneCall size={14} />} sub={callsBooked > 0 ? `${showRate}% présence` : undefined} />
        <MiniKpi label="Clients" value={clients} icon={<UserCheck size={14} />} delta={dClients} highlight />
      </div>

      {/* Objectifs + Insights EN HAUT */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <Panel title="Objectifs">
          <div style={{ paddingTop: 8, display: "flex", flexDirection: "column", gap: "12px" }}>
            {objectives.map((g, i) => {
              const pct = Math.min(Math.round((g.current / g.goal) * 100), 100);
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{g.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{g.current} / {g.goal}</span>
                  </div>
                  <div style={{ height: 7, background: "var(--border-color)", borderRadius: 4 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: g.color, borderRadius: 4, transition: "width 0.5s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Insights">
          <div style={{ paddingTop: 8, display: "flex", flexDirection: "column", gap: "8px" }}>
            {callConv > 15 && (
              <Insight tone="good" text={`Taux call→client de ${callConv}% — au-dessus de la moyenne B2B (10-15%).`} />
            )}
            {showRate > 0 && showRate < 70 && (
              <Insight tone="warn" text={`Seulement ${showRate}% de présence aux calls. Ajoute un rappel automatique 1h avant.`} />
            )}
            {viewsToDm !== null && parseFloat(viewsToDm) < 1 && (
              <Insight tone="neutral" text={`${viewsToDm}% des vues déclenchent un DM. Teste un CTA plus direct dans tes Reels.`} />
            )}
            {(data?.noShows ?? 0) > 2 && (
              <Insight tone="warn" text={`${data?.noShows} no-shows sur la période. Renforce les rappels.`} />
            )}
            {clients === 0 && callsBooked > 0 && (
              <Insight tone="neutral" text="Aucun client signé. Mets à jour le stage des prospects dans le CRM." />
            )}
            {dClients !== null && dClients > 0 && (
              <Insight tone="good" text={`+${dClients}% de clients vs la période précédente. Belle progression.`} />
            )}
          </div>
        </Panel>
      </div>

      {/* Business : valeur + vélocité */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
        <KpiCard title="CA généré" value={business && business.totalRevenue > 0 ? `${business.totalRevenue.toLocaleString("fr-FR")} €` : "—"} sub={`sur ${period.label.toLowerCase()}`} accent="sage" icon={<Euro size={15} />} />
        <KpiCard title="Panier moyen" value={business && business.avgDealSize > 0 ? `${business.avgDealSize.toLocaleString("fr-FR")} €` : "—"} sub="par client signé" accent="yellow" icon={<Target size={15} />} />
        <KpiCard title="Vélocité" value={business?.avgVelocityDays != null ? `${business.avgVelocityDays} j` : "—"} sub="call → signature" accent="lavender" icon={<Clock size={15} />} />
        <KpiCard title="Conv. globale" value={globalConv !== "—" ? `${globalConv}%` : "—"} sub="vues → client" accent="coral" icon={<TrendingUp size={15} />} />
      </div>

      {/* Entonnoir façon Zentra */}
      <Panel title="Entonnoir de conversion">
        <FunnelChartV2 steps={funnelSteps} />

        {/* Taux inter-étapes en bandeau */}
        <div style={{ display: "flex", gap: "8px", marginTop: "20px", padding: "14px", background: "var(--bg-cream)", borderRadius: "var(--radius-row)" }}>
          {[
            { label: "Vues → DM", value: viewsToDm !== null ? `${viewsToDm}%` : "—", color: "#A8C5A0" },
            { label: "Site → Call", value: siteVisits && siteVisits > 0 ? `${Math.round((callsBooked / siteVisits) * 100)}%` : "N/A", color: "#F0C860" },
            { label: "Présence calls", value: callsBooked > 0 ? `${showRate}%` : "—", color: "#8F9FE0" },
            { label: "Call → Client", value: callsBooked > 0 ? `${callConv}%` : "—", color: "#E8A090" },
          ].map((r, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", padding: "10px", background: "#FFF", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>{r.value}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{r.label}</div>
              <div style={{ height: 3, background: r.color, borderRadius: 2, marginTop: 8 }} />
            </div>
          ))}
        </div>
      </Panel>

      {/* Performance par contenu */}
      <div style={{ marginTop: "16px" }}>
        <Panel title="Performance par contenu · source Cal.com">
          <div style={{ paddingTop: 8 }}>
            {data?.callSources && data.callSources.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Contenu / Booking", "Calls", "Clients", "Conv."].map((h) => (
                      <th key={h} style={{ textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px", padding: "0 0 12px", borderBottom: "1px solid var(--border-color)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.callSources.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500, padding: "12px 0", borderBottom: i < data.callSources.length - 1 ? "1px solid var(--border-color)" : "none" }}>{s.source}</td>
                      <td style={{ fontSize: 13, fontWeight: 700, padding: "12px 0", borderBottom: i < data.callSources.length - 1 ? "1px solid var(--border-color)" : "none" }}>{s.calls}</td>
                      <td style={{ fontSize: 13, fontWeight: 700, color: s.clients > 0 ? "#2E5E28" : "var(--text-muted)", padding: "12px 0", borderBottom: i < data.callSources.length - 1 ? "1px solid var(--border-color)" : "none" }}>{s.clients > 0 ? `+${s.clients}` : "—"}</td>
                      <td style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", padding: "12px 0", borderBottom: i < data.callSources.length - 1 ? "1px solid var(--border-color)" : "none" }}>{s.calls > 0 ? `${Math.round((s.clients / s.calls) * 100)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-muted)", paddingTop: 8 }}>Aucun call enregistré pour l&apos;instant.</div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// Mini-carte KPI compacte avec delta
function MiniKpi({ label, value, icon, delta, sub, highlight }: {
  label: string; value: number; icon: React.ReactNode; delta?: number | null; sub?: string; highlight?: boolean;
}) {
  return (
    <div style={{ position: "relative", background: highlight ? "var(--sage-light)" : "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)", fontWeight: 500, marginBottom: 8 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px" }}>
        {value > 0 ? value.toLocaleString("fr-FR") : "—"}
      </div>
      {sub ? (
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>
      ) : (
        <DeltaBadge delta={delta} />
      )}
    </div>
  );
}

// Badge de variation ▲/▼
function DeltaBadge({ delta }: { delta?: number | null }) {
  if (delta === null || delta === undefined) {
    return <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>—</div>;
  }
  const positive = delta >= 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: positive ? "#2E5E28" : "#7A3028", marginTop: 3 }}>
      {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {positive ? "+" : ""}{delta}% <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>vs préc.</span>
    </div>
  );
}

// Bloc insight coloré
function Insight({ tone, text }: { tone: "good" | "warn" | "neutral"; text: string }) {
  const styles = {
    good: { bg: "#F0F7EF", color: "var(--text-secondary)" },
    warn: { bg: "var(--yellow-light)", color: "#7A5E10" },
    neutral: { bg: "var(--bg-cream)", color: "var(--text-secondary)" },
  }[tone];
  return (
    <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: styles.bg, borderRadius: "var(--radius-sm)", fontSize: 12, color: styles.color, lineHeight: 1.5 }}>
      <Lightbulb size={13} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{text}</span>
    </div>
  );
}
