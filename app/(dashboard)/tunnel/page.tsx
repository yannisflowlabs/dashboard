"use client";

import { useEffect, useState } from "react";
import { TrendingUp, MessageCircle, PhoneCall, UserCheck, AlertCircle, Wifi, Loader2, Play } from "lucide-react";
import Panel from "@/components/ui/Panel";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import FunnelChart from "@/components/charts/FunnelChart";

interface TunnelData {
  funnel: {
    reelsViews: number;
    dmSent: number;
    siteVisits: number | null;
    callsBooked: number;
    clients: number;
  };
  monthly: {
    calls: number;
    clients: number;
    prospects: number;
    dmSent: number;
  };
  callSources: { source: string; calls: number; clients: number }[];
  followersHistory: { date: string; followers: number }[];
  noShows: number;
  totalCallsDone: number;
  hasPlausible: boolean;
  updatedAt: string;
}

export default function TunnelPage() {
  const [data, setData] = useState<TunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tunnel")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const reelsViews = data?.funnel.reelsViews ?? 0;
  const dmSent = data?.funnel.dmSent ?? 0;
  const siteVisits = data?.funnel.siteVisits ?? null;
  const callsBooked = data?.funnel.callsBooked ?? 0;
  const clients = data?.funnel.clients ?? 0;

  const funnelSteps = [
    {
      label: "Vues Reels",
      value: reelsViews,
      sub: reelsViews > 0 ? "Total vues · cache Instagram" : "Cache Instagram non disponible",
      color: "#A8C5A0",
    },
    {
      label: "DM envoyés",
      value: dmSent,
      sub: dmSent > 0 ? "Via ManyChat · webhook" : "En attente du premier DM",
      color: "#C5B8E8",
    },
    {
      label: "Visites site web",
      value: siteVisits ?? 0,
      sub: siteVisits !== null ? "Via Plausible Analytics" : "Plausible non configuré",
      color: "#F0C860",
    },
    {
      label: "Calls réservés",
      value: callsBooked,
      sub: "Via Cal.com · tous statuts",
      color: "#B8B0E8",
    },
    {
      label: "Clients signés",
      value: clients,
      sub: "Stage «client» dans le CRM",
      color: "#E8A090",
    },
  ];

  const globalConv = reelsViews > 0
    ? ((clients / reelsViews) * 100).toFixed(3)
    : "—";
  const dmToSite = dmSent > 0 && siteVisits !== null
    ? Math.round((siteVisits / dmSent) * 100)
    : null;
  const callConv = callsBooked > 0
    ? Math.round((clients / callsBooked) * 100)
    : 0;
  const siteToCall = siteVisits !== null && siteVisits > 0
    ? Math.round((callsBooked / siteVisits) * 100)
    : null;
  const viewsToDm = reelsViews > 0 && dmSent > 0
    ? ((dmSent / reelsViews) * 100).toFixed(1)
    : null;

  const objectives = [
    { label: "Clients cible (2025)", current: clients, goal: 10, color: "var(--sage)" },
    { label: "Calls/mois cible", current: data?.monthly.calls ?? 0, goal: 15, color: "var(--yellow)" },
    { label: "DM/mois cible", current: data?.monthly.dmSent ?? 0, goal: 100, color: "var(--lavender)" },
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
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "12px 16px", background: "#FFF0EE",
          borderRadius: "var(--radius-row)", fontSize: 13, color: "#8B2E22",
        }}>
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
        subtitle="Vues Reels → DM ManyChat → Site web → Call → Client"
      />

      {/* Status bar */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "8px 12px", background: "#F0F7EF",
          borderRadius: "var(--radius-row)", fontSize: 12, color: "#2E5E28",
        }}>
          <Wifi size={12} />
          <span>
            Cal.com · {callsBooked} calls · {clients} clients CRM · {dmSent} DM loggés
            {updatedLabel && ` · ${updatedLabel}`}
          </span>
        </div>

        {dmSent === 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 12px", background: "var(--yellow-light)",
            borderRadius: "var(--radius-row)", fontSize: 12, color: "#7A5E10",
          }}>
            <AlertCircle size={12} />
            <span>
              Webhook ManyChat non encore déclenché — configure l'URL dans ton flow ManyChat.
            </span>
          </div>
        )}

        {!data?.hasPlausible && (
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 12px", background: "#F5F3FF",
            borderRadius: "var(--radius-row)", fontSize: 12, color: "#5B4A8A",
          }}>
            <AlertCircle size={12} />
            <span>
              Visites site non disponibles —{" "}
              <a href="/reglages" style={{ color: "inherit", fontWeight: 600, textDecoration: "underline" }}>
                configure Plausible
              </a>
              .
            </span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "20px" }}>
        <KpiCard
          title="Vues Reels"
          value={reelsViews > 0 ? reelsViews.toLocaleString("fr-FR") : "—"}
          sub="Cache Instagram"
          accent="sage"
          icon={<Play size={15} />}
        />
        <KpiCard
          title="DM envoyés"
          value={dmSent > 0 ? dmSent.toLocaleString("fr-FR") : "—"}
          sub={`${data?.monthly.dmSent ?? 0} ce mois`}
          accent="lavender"
          icon={<MessageCircle size={15} />}
        />
        <KpiCard
          title="Conversion globale"
          value={globalConv !== "—" ? `${globalConv}%` : "—"}
          sub="Vues → Client"
          accent="yellow"
          icon={<TrendingUp size={15} />}
        />
        <KpiCard
          title="Calls → Client"
          value={callsBooked > 0 ? `${callConv}%` : "—"}
          sub={`${clients} clients / ${callsBooked} calls`}
          accent="coral"
          icon={<PhoneCall size={15} />}
        />
        <KpiCard
          title="Clients signés"
          value={String(clients)}
          sub={`${data?.monthly.clients ?? 0} ce mois`}
          accent="sage"
          icon={<UserCheck size={15} />}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "16px" }}>
        {/* Funnel + Performance */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Panel title="Entonnoir de conversion">
            <div style={{ paddingTop: 12 }}>
              <FunnelChart steps={funnelSteps} />

              {/* Taux inter-étapes */}
              <div style={{
                display: "flex", gap: "10px", marginTop: "20px",
                padding: "14px", background: "var(--bg-cream)", borderRadius: "var(--radius-row)",
              }}>
                {[
                  { label: "Vues → DM", value: viewsToDm !== null ? `${viewsToDm}%` : "—", color: "#A8C5A0" },
                  { label: "DM → Site", value: dmToSite !== null ? `${dmToSite}%` : "N/A", color: "#C5B8E8" },
                  { label: "Site → Call", value: siteToCall !== null ? `${siteToCall}%` : "N/A", color: "#F0C860" },
                  { label: "Call → Client", value: callsBooked > 0 ? `${callConv}%` : "—", color: "#B8B0E8" },
                ].map((r, i) => (
                  <div key={i} style={{
                    flex: 1, textAlign: "center", padding: "10px",
                    background: "#FFF", borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-color)",
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
                      {r.value}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{r.label}</div>
                    <div style={{ height: 3, background: r.color, borderRadius: 2, marginTop: 8 }} />
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Performance par contenu · source Cal.com">
            <div style={{ paddingTop: 8 }}>
              {data?.callSources && data.callSources.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Contenu / Booking", "Calls", "Clients", "Conv."].map((h) => (
                        <th key={h} style={{
                          textAlign: "left", fontSize: 11, fontWeight: 600,
                          color: "var(--text-muted)", textTransform: "uppercase",
                          letterSpacing: "0.4px", padding: "0 0 12px",
                          borderBottom: "1px solid var(--border-color)",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.callSources.map((s, i) => (
                      <tr key={i}>
                        <td style={{
                          fontSize: 13, color: "var(--text-primary)", fontWeight: 500,
                          padding: "12px 0",
                          borderBottom: i < data.callSources.length - 1 ? "1px solid var(--border-color)" : "none",
                        }}>
                          {s.source}
                        </td>
                        <td style={{
                          fontSize: 13, fontWeight: 700, padding: "12px 0",
                          borderBottom: i < data.callSources.length - 1 ? "1px solid var(--border-color)" : "none",
                        }}>
                          {s.calls}
                        </td>
                        <td style={{
                          fontSize: 13, fontWeight: 700,
                          color: s.clients > 0 ? "#2E5E28" : "var(--text-muted)",
                          padding: "12px 0",
                          borderBottom: i < data.callSources.length - 1 ? "1px solid var(--border-color)" : "none",
                        }}>
                          {s.clients > 0 ? `+${s.clients}` : "—"}
                        </td>
                        <td style={{
                          fontSize: 13, fontWeight: 600, color: "var(--text-secondary)",
                          padding: "12px 0",
                          borderBottom: i < data.callSources.length - 1 ? "1px solid var(--border-color)" : "none",
                        }}>
                          {s.calls > 0 ? `${Math.round((s.clients / s.calls) * 100)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ fontSize: 13, color: "var(--text-muted)", paddingTop: 8 }}>
                  Aucun call enregistré pour l'instant.
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Right rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Webhook setup */}
          <Panel title="Config ManyChat webhook">
            <div style={{ paddingTop: 8 }}>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 10 }}>
                Dans ton flow ManyChat, ajoute une action <strong>External Request</strong> avec cette URL :
              </p>
              <div style={{
                padding: "10px 12px", background: "#1C1C1E",
                borderRadius: 8, fontFamily: "monospace", fontSize: 11,
                color: "#A8C5A0", wordBreak: "break-all",
              }}>
                POST {typeof window !== "undefined" ? window.location.origin : ""}/api/manychat/webhook
              </div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>
                Méthode : <strong>POST</strong> · Body optionnel : <code style={{ background: "#F0EDE8", padding: "1px 4px", borderRadius: 3 }}>{"{ \"flow_name\": \"{{flow_name}}\" }"}</code>
              </p>
              <div style={{
                marginTop: 10, padding: "8px 12px",
                background: dmSent > 0 ? "#F0F7EF" : "var(--yellow-light)",
                borderRadius: "var(--radius-sm)", fontSize: 12,
                color: dmSent > 0 ? "#2E5E28" : "#7A5E10",
                fontWeight: 600,
              }}>
                {dmSent > 0 ? `✓ ${dmSent} DM loggé${dmSent > 1 ? "s" : ""}` : "En attente du premier ping…"}
              </div>
            </div>
          </Panel>

          {/* Qualité calls */}
          <Panel title="Qualité des calls">
            <div style={{ paddingTop: 8, display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: "Calls effectués", value: data?.totalCallsDone ?? 0 },
                { label: "No-shows / annulés", value: data?.noShows ?? 0 },
                {
                  label: "Taux présence",
                  value: (data?.totalCallsDone ?? 0) + (data?.noShows ?? 0) > 0
                    ? `${Math.round(((data?.totalCallsDone ?? 0) / ((data?.totalCallsDone ?? 0) + (data?.noShows ?? 0))) * 100)}%`
                    : "—",
                },
              ].map((stat, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 12px", background: "var(--bg-cream)",
                  borderRadius: "var(--radius-sm)",
                }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{stat.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Objectifs */}
          <Panel title="Objectifs">
            <div style={{ paddingTop: 8, display: "flex", flexDirection: "column", gap: "14px" }}>
              {objectives.map((g, i) => {
                const pct = Math.min(Math.round((g.current / g.goal) * 100), 100);
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{g.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{g.current} / {g.goal}</span>
                    </div>
                    <div style={{ height: 7, background: "var(--border-color)", borderRadius: 4 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: g.color, borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{pct}% de l'objectif</div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Insights dynamiques */}
          <Panel title="Insights">
            <div style={{ paddingTop: 8, display: "flex", flexDirection: "column", gap: "10px" }}>
              {callConv > 15 && (
                <div style={{
                  padding: "10px 12px", background: "#F0F7EF",
                  borderRadius: "var(--radius-sm)", fontSize: 12,
                  color: "var(--text-secondary)", lineHeight: 1.5,
                }}>
                  Taux call→client de {callConv}% — au-dessus de la moyenne B2B (10-15%).
                </div>
              )}
              {viewsToDm !== null && parseFloat(viewsToDm) < 1 && (
                <div style={{
                  padding: "10px 12px", background: "var(--bg-cream)",
                  borderRadius: "var(--radius-sm)", fontSize: 12,
                  color: "var(--text-secondary)", lineHeight: 1.5,
                }}>
                  Seulement {viewsToDm}% des vues déclenchent un DM. Teste un CTA plus direct dans tes Reels.
                </div>
              )}
              {(data?.noShows ?? 0) > 2 && (
                <div style={{
                  padding: "10px 12px", background: "var(--yellow-light)",
                  borderRadius: "var(--radius-sm)", fontSize: 12,
                  color: "#7A5E10", lineHeight: 1.5,
                }}>
                  {data?.noShows} no-shows. Envoie un rappel automatique 1h avant le call.
                </div>
              )}
              {clients === 0 && callsBooked > 0 && (
                <div style={{
                  padding: "10px 12px", background: "var(--bg-cream)",
                  borderRadius: "var(--radius-sm)", fontSize: 12,
                  color: "var(--text-secondary)", lineHeight: 1.5,
                }}>
                  Aucun client dans le CRM. Met à jour le stage des prospects dans la page CRM.
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
