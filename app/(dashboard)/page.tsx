import { Calendar, TrendingUp, Users } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard";
import Panel from "@/components/ui/Panel";
import PageHeader from "@/components/ui/PageHeader";
import BarChart from "@/components/charts/BarChart";
import DonutChart from "@/components/charts/DonutChart";
import Badge from "@/components/ui/Badge";

const revenueData = [
  { label: "Jan", value: 2800 },
  { label: "Fév", value: 3200 },
  { label: "Mar", value: 2600 },
  { label: "Avr", value: 3800 },
  { label: "Mai", value: 4200, highlight: true },
  { label: "Juin", value: 1400 },
];

const revenueBreakdown = [
  { label: "Abonnements", value: 54, color: "#A8C5A0" },
  { label: "Projets ponctuels", value: 30, color: "#F0C860" },
  { label: "Formations", value: 16, color: "#B8B0E8" },
];

const pipeline = [
  { name: "Camille Laurent", status: "Client", statusVariant: "sage" as const, amount: "€3 500", initials: "CL", color: "#A8C5A0" },
  { name: "Thomas Berger", status: "Proposition", statusVariant: "yellow" as const, amount: "€2 800", initials: "TB", color: "#F0C860" },
  { name: "Sofia Marchetti", status: "Prospect", statusVariant: "neutral" as const, amount: "€1 500", initials: "SM", color: "#B8B0E8" },
];

const recentActivity = [
  { text: "Nouveau lead qualifié — Thomas Berger", time: "Il y a 2h", dot: "#F0C860" },
  { text: "Paiement reçu — Camille Laurent €3 500", time: "Hier", dot: "#A8C5A0" },
  { text: "RDV confirmé — Sofia Marchetti (demain 10h)", time: "Il y a 2j", dot: "#B8B0E8" },
];

export default function DashboardPage() {
  return (
    <div
      style={{
        display: "flex",
        gap: "20px",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px" }}>
        <PageHeader
          title="Vue d'ensemble"
          subtitle="Juin 2025 · Résumé de ton activité"
        />

        {/* KPI row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "14px",
            marginBottom: "20px",
          }}
        >
          <KpiCard
            title="CA ce mois"
            value="€4 200"
            badge="+23%"
            badgePositive
            accent="sage"
          />
          <KpiCard
            title="Leads actifs"
            value="2"
            sub="€4 300 en pipeline"
            accent="yellow"
            icon={<Users size={16} />}
          />
          <KpiCard
            title="Prochain RDV"
            value="Aujourd'hui"
            sub="14h30 · Cal.com"
            accent="lavender"
            icon={<Calendar size={16} />}
          />
        </div>

        {/* Revenue bar chart */}
        <Panel
          title="Revenu mensuel"
          action={
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
              6 derniers mois
            </span>
          }
          style={{ marginBottom: "20px" }}
        >
          <div style={{ paddingTop: 8 }}>
            <div style={{ marginBottom: 4, display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>€18 400</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>total YTD</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#2E5E28", marginLeft: 4 }}>+18% vs. an dernier</span>
            </div>
            <BarChart data={revenueData} height={140} />
          </div>
        </Panel>

        {/* Pipeline list */}
        <Panel title="CRM Pipeline" action={<a href="/crm" style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "none" }}>Voir tout →</a>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: 8 }}>
            {pipeline.map((c, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  background: "var(--bg-cream)",
                  borderRadius: "var(--radius-row)",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: c.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#1C1C1E",
                    flexShrink: 0,
                  }}
                >
                  {c.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {c.name}
                  </div>
                </div>
                <Badge label={c.status} variant={c.statusVariant} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  {c.amount}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Right rail */}
      <div
        style={{
          width: "var(--right-rail-width)",
          minWidth: "var(--right-rail-width)",
          overflowY: "auto",
          padding: "28px 20px 28px 0",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Donut chart */}
        <Panel title="Sources de revenu">
          <div style={{ paddingTop: 8 }}>
            <DonutChart
              data={revenueBreakdown}
              size={110}
              thickness={20}
              centerValue="€18k"
              centerLabel="total"
            />
          </div>
        </Panel>

        {/* Quick stats */}
        <Panel title="Performances">
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: 8 }}>
            {[
              { label: "Taux de conversion leads", value: "50%", icon: TrendingUp, color: "#2E5E28" },
              { label: "Panier moyen", value: "€2 600", icon: TrendingUp, color: "#7A5E10" },
              { label: "Clients actifs", value: "1", icon: Users, color: "#3E3680" },
            ].map((s, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Activité récente */}
        <Panel title="Activité récente">
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: 8 }}>
            {recentActivity.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: "12px" }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: a.dot,
                    marginTop: 4,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500, lineHeight: 1.4 }}>
                    {a.text}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {a.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
