"use client";

import { useState } from "react";
import { Check, ExternalLink, AlertCircle } from "lucide-react";
import Panel from "@/components/ui/Panel";
import PageHeader from "@/components/ui/PageHeader";

interface IntegrationProps {
  name: string;
  description: string;
  connected: boolean;
  badge?: string;
  docsUrl?: string;
  fields: { label: string; key: string; type?: string; placeholder: string }[];
}

function IntegrationCard({ name, description, connected: initConnected, badge, fields }: IntegrationProps) {
  const [connected, setConnected] = useState(initConnected);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <div
      style={{
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-row)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", gap: "14px",
          padding: "16px 20px", cursor: "pointer",
        }}
        onClick={() => setOpen(!open)}
      >
        <div
          style={{
            width: 10, height: 10, borderRadius: "50%",
            background: connected ? "#A8C5A0" : "#D0CCC4",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{name}</span>
            {badge && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "var(--yellow-light)", color: "#7A5E10" }}>
                {badge}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{description}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {connected ? (
            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: 12, fontWeight: 600, color: "#2E5E28" }}>
              <Check size={12} /> Connecté
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Non configuré</span>
          )}
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {fields.map((f) => (
              <div key={f.key}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  {f.label}
                </label>
                <input
                  type={f.type || "text"}
                  placeholder={f.placeholder}
                  value={values[f.key] || ""}
                  onChange={(e) => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{
                    width: "100%", padding: "9px 12px",
                    borderRadius: "var(--radius-nav)",
                    border: "1px solid var(--border-color)",
                    fontSize: 13, fontFamily: "inherit", outline: "none",
                  }}
                />
              </div>
            ))}
            <div style={{ display: "flex", gap: "8px", marginTop: 4 }}>
              <button
                onClick={() => setConnected(true)}
                style={{
                  padding: "9px 18px", borderRadius: "var(--radius-nav)",
                  border: "none", background: "var(--text-primary)", color: "#FFF",
                  cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                }}
              >
                Sauvegarder
              </button>
              {connected && (
                <button
                  onClick={() => setConnected(false)}
                  style={{
                    padding: "9px 18px", borderRadius: "var(--radius-nav)",
                    border: "1px solid var(--border-color)", background: "#FFF",
                    cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                    color: "var(--text-secondary)",
                  }}
                >
                  Déconnecter
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const integrations: IntegrationProps[] = [
  {
    name: "Stripe",
    description: "Synchronise ton chiffre d'affaires et tes paiements",
    connected: false,
    fields: [
      { label: "Clé secrète Stripe (sk_live_...)", key: "stripe_key", type: "password", placeholder: "sk_live_xxxxxxxxxxxx" },
    ],
  },
  {
    name: "Google Calendar",
    description: "Affiche tes événements et rendez-vous Google",
    connected: false,
    fields: [
      { label: "Client ID OAuth", key: "gcal_client_id", placeholder: "xxxx.apps.googleusercontent.com" },
      { label: "Client Secret", key: "gcal_secret", type: "password", placeholder: "GOCSPX-xxxx" },
    ],
  },
  {
    name: "Cal.com",
    description: "Synchronise tes réservations et créneaux Cal.com",
    connected: false,
    fields: [
      { label: "Clé API Cal.com", key: "calcom_key", type: "password", placeholder: "cal_live_xxxx" },
      { label: "URL de ton Cal.com", key: "calcom_url", placeholder: "https://cal.com/ton-nom" },
    ],
  },
  {
    name: "Instagram Graph API",
    description: "Statistiques Creator — abonnés, portée, engagement",
    connected: false,
    badge: "Creator requis",
    fields: [
      { label: "Access Token Instagram", key: "ig_token", type: "password", placeholder: "EAA..." },
      { label: "ID du compte Instagram", key: "ig_account_id", placeholder: "17841xxxxxxxxxx" },
    ],
  },
  {
    name: "Plausible Analytics",
    description: "Trafic site web et suivi UTM pour le tunnel de conversion",
    connected: false,
    fields: [
      { label: "Clé API Plausible", key: "plausible_key", type: "password", placeholder: "xxxx" },
      { label: "Domaine du site", key: "plausible_domain", placeholder: "yannis.ai" },
    ],
  },
];

export default function ReglagesPage() {
  const [businessName, setBusinessName] = useState("Yannis.ai");
  const [calUrl, setCalUrl] = useState("https://cal.com/yannis");
  const [websiteUrl, setWebsiteUrl] = useState("https://yannis.ai");

  return (
    <div style={{ padding: "28px 28px", maxWidth: 800 }}>
      <PageHeader
        title="Réglages"
        subtitle="Intégrations API et configuration du dashboard"
      />

      {/* Security notice */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "10px 14px", background: "var(--sage-light)",
          borderRadius: "var(--radius-row)", marginBottom: "24px",
          fontSize: 12, color: "#2E5E28",
        }}
      >
        <Check size={14} />
        <span>
          Les clés API sont stockées localement dans des variables d'environnement. Ne les commite jamais dans ton dépôt Git.
        </span>
      </div>

      {/* Profile settings */}
      <Panel title="Profil business" style={{ marginBottom: "20px" }}>
        <div style={{ paddingTop: 8, display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { label: "Nom du business", value: businessName, setter: setBusinessName, placeholder: "Yannis.ai" },
            { label: "URL Cal.com", value: calUrl, setter: setCalUrl, placeholder: "https://cal.com/..." },
            { label: "URL du site web", value: websiteUrl, setter: setWebsiteUrl, placeholder: "https://..." },
          ].map((f) => (
            <div key={f.label}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                {f.label}
              </label>
              <input
                type="text"
                value={f.value}
                onChange={(e) => f.setter(e.target.value)}
                placeholder={f.placeholder}
                style={{
                  width: "100%", padding: "9px 12px",
                  borderRadius: "var(--radius-nav)",
                  border: "1px solid var(--border-color)",
                  fontSize: 13, fontFamily: "inherit", outline: "none",
                }}
              />
            </div>
          ))}
          <button
            style={{
              alignSelf: "flex-start",
              padding: "9px 18px", borderRadius: "var(--radius-nav)",
              border: "none", background: "var(--text-primary)", color: "#FFF",
              cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
            }}
          >
            Sauvegarder le profil
          </button>
        </div>
      </Panel>

      {/* Integrations */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: "12px", color: "var(--text-primary)" }}>
          Intégrations API
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {integrations.map((integration) => (
            <IntegrationCard key={integration.name} {...integration} />
          ))}
        </div>
      </div>

      {/* Env file reminder */}
      <div
        style={{
          marginTop: "24px",
          padding: "16px 18px",
          background: "var(--bg-cream)",
          borderRadius: "var(--radius-row)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <AlertCircle size={14} style={{ color: "var(--text-muted)" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
            Configuration via .env.local
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Pour la production, ajoute tes clés directement dans le fichier{" "}
          <code style={{ fontFamily: "monospace", background: "#E8E4DC", padding: "1px 5px", borderRadius: 4 }}>
            .env.local
          </code>{" "}
          à la racine du projet. Les variables sont chargées automatiquement par Next.js.
        </p>
        <div
          style={{
            marginTop: "10px",
            padding: "10px 14px",
            background: "#1C1C1E",
            borderRadius: 8,
            fontFamily: "monospace",
            fontSize: 11,
            color: "#A8C5A0",
            lineHeight: 1.8,
          }}
        >
          <div>STRIPE_SECRET_KEY=sk_live_...</div>
          <div>GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com</div>
          <div>CAL_API_KEY=cal_live_...</div>
          <div>INSTAGRAM_ACCESS_TOKEN=EAA...</div>
          <div>PLAUSIBLE_API_KEY=xxxx</div>
        </div>
      </div>
    </div>
  );
}
