"use client";

import { useState, useEffect } from "react";
import { Plus, TrendingUp, CreditCard, Loader2 } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard";
import Panel from "@/components/ui/Panel";
import PageHeader from "@/components/ui/PageHeader";
import BarChart from "@/components/charts/BarChart";
import Badge from "@/components/ui/Badge";

interface StripeData {
  monthlyRevenue: number;
  mrr: number;
  available: number;
  activeSubscriptions: number;
  transactions: {
    id: string;
    date: string;
    customer: string;
    description: string;
    amount: number;
    currency: string;
  }[];
  monthlyHistory: { label: string; value: number }[];
}

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function FinancesPage() {
  const [data, setData] = useState<StripeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetch("/api/stripe")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Impossible de contacter l'API Stripe"))
      .finally(() => setLoading(false));
  }, []);

  const chartData = data?.monthlyHistory.map((m, i, arr) => ({
    ...m,
    highlight: i === arr.length - 1,
  })) ?? [];

  const ytd = data?.monthlyHistory.reduce((s, m) => s + m.value, 0) ?? 0;

  return (
    <div style={{ padding: "28px 28px", maxWidth: 1100 }}>
      <PageHeader
        title="Finances"
        subtitle="Données Stripe en temps réel"
        action={
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "9px 16px", background: "var(--text-primary)", color: "#FFF",
              borderRadius: "var(--radius-nav)", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600,
            }}
          >
            <Plus size={14} /> Saisie manuelle
          </button>
        }
      />

      {error && (
        <div style={{ padding: "12px 16px", background: "var(--coral-light)", borderRadius: "var(--radius-row)", marginBottom: 20, fontSize: 13, color: "#7A3028" }}>
          Erreur Stripe : {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "60px 0", color: "var(--text-muted)", fontSize: 13 }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
          Chargement des données Stripe...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "20px" }}>
            <KpiCard
              title="CA ce mois"
              value={`€${fmt(data?.monthlyRevenue ?? 0)}`}
              accent="sage"
            />
            <KpiCard
              title="CA total (6 mois)"
              value={`€${fmt(ytd)}`}
              sub="Cumul"
              accent="yellow"
            />
            <KpiCard
              title="MRR"
              value={`€${fmt(data?.mrr ?? 0)}`}
              sub={`${data?.activeSubscriptions ?? 0} abonnement(s) actif(s)`}
              accent="lavender"
              icon={<TrendingUp size={15} />}
            />
            <KpiCard
              title="Solde disponible"
              value={`€${fmt(data?.available ?? 0)}`}
              sub="Sur ton compte Stripe"
              accent="coral"
              icon={<CreditCard size={15} />}
            />
          </div>

          {/* Chart */}
          <Panel
            title="Revenus mensuels"
            action={<span style={{ fontSize: 12, color: "var(--text-muted)" }}>6 derniers mois</span>}
            style={{ marginBottom: "20px" }}
          >
            <div style={{ paddingTop: 12 }}>
              {chartData.length > 0 ? (
                <BarChart data={chartData} height={160} />
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: "40px 0" }}>
                  Aucune donnée disponible
                </div>
              )}
            </div>
          </Panel>

          {/* Transactions */}
          <Panel title="Historique des paiements (Stripe)">
            <div style={{ paddingTop: 8 }}>
              {data?.transactions.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: "30px 0" }}>
                  Aucune transaction trouvée sur ce compte test
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Date", "Client", "Description", "Montant", "Statut"].map((h) => (
                        <th key={h} style={{ textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px", padding: "0 0 12px", borderBottom: "1px solid var(--border-color)" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data?.transactions.map((t, i) => (
                      <tr key={t.id}>
                        <td style={{ fontSize: 12, color: "var(--text-muted)", padding: "12px 0", borderBottom: i < (data.transactions.length - 1) ? "1px solid var(--border-color)" : "none" }}>{t.date}</td>
                        <td style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", padding: "12px 0", borderBottom: i < (data.transactions.length - 1) ? "1px solid var(--border-color)" : "none" }}>{t.customer}</td>
                        <td style={{ fontSize: 13, color: "var(--text-secondary)", padding: "12px 0", borderBottom: i < (data.transactions.length - 1) ? "1px solid var(--border-color)" : "none" }}>{t.description}</td>
                        <td style={{ fontSize: 13, fontWeight: 700, color: "#2E5E28", padding: "12px 0", borderBottom: i < (data.transactions.length - 1) ? "1px solid var(--border-color)" : "none" }}>+€{fmt(t.amount)}</td>
                        <td style={{ padding: "12px 0", borderBottom: i < (data.transactions.length - 1) ? "1px solid var(--border-color)" : "none" }}>
                          <Badge label="Payé" variant="sage" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Panel>
        </>
      )}

      {/* Modal saisie manuelle */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setShowAddModal(false)}>
          <div style={{ background: "#FFF", borderRadius: "var(--radius-card)", padding: "28px", width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Ajouter une entrée manuelle</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { label: "Date", type: "date" },
                { label: "Client", type: "text", placeholder: "Nom du client" },
                { label: "Description", type: "text", placeholder: "Description du paiement" },
                { label: "Montant (€)", type: "number", placeholder: "0" },
              ].map((f) => (
                <div key={f.label}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} style={{ width: "100%", padding: "10px 14px", borderRadius: "var(--radius-nav)", border: "1px solid var(--border-color)", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-nav)", border: "1px solid var(--border-color)", background: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>Annuler</button>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-nav)", border: "none", background: "var(--text-primary)", color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
