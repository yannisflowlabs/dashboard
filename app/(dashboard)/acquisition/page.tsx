"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Play, Users, PhoneCall, UserCheck, Clock, Link2, Check,
  ChevronDown, MessageCircle, FileText, Mail, AlertCircle, Euro,
} from "lucide-react";
import Panel from "@/components/ui/Panel";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import FunnelChartV2, { type FunnelStepV2 } from "@/components/charts/FunnelChartV2";

interface JourneyEvent { type: string; flow: string | null; video: string | null; at: string; }
interface Journey {
  key: string;
  handle: string | null;
  name: string | null;
  email: string | null;
  linkedManually: boolean;
  firstVideo: string | null;
  firstVideoFlow: string | null;
  events: JourneyEvent[];
  firstTouchAt: string | null;
  callBookedAt: string | null;
  clientSince: string | null;
  stage: string;
  segment: "company" | "individual" | null;
  daysToCall: number | null;
  dealAmount: number | null;
}
interface VideoPerf { flow: string; label: string; people: number; calls: number; clients: number; revenue: number; }
interface Unlinked { key: string; handle: string | null; name: string | null; firstVideo: string | null; }
interface AcqData {
  journeys: Journey[];
  funnel: Record<string, number>;
  individualsCount: number;
  videos: VideoPerf[];
  avgDaysToCall: number | null;
  unlinked: Unlinked[];
  totalPeople: number;
  updatedAt: string;
}

const STAGE_LABELS: Record<string, string> = {
  comment: "Commentaire", dm: "DM", subscribed: "Abonné Insta",
  email_captured: "Email récupéré", guide_sent: "Guide envoyé", company: "Entreprise",
  individual: "Particulier", call_booked: "Call réservé",
  call_done: "Call réalisé", client: "Client",
};
const STAGE_COLORS: Record<string, string> = {
  comment: "#B8B0E8", dm: "#9BB8E0", subscribed: "#8EC3E0", email_captured: "#7FC9C4",
  guide_sent: "#8FCBA8", company: "#A8C5A0", individual: "#D8D2C4",
  call_booked: "#F0C860", call_done: "#F0A860", client: "#8FBF7F",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtNum(n: number) { return n.toLocaleString("fr-FR"); }

export default function AcquisitionPage() {
  const [data, setData] = useState<AcqData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/acquisition");
      const d = await res.json();
      if (d.error) setError(d.error);
      else { setData(d); setError(null); }
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ padding: 28 }}>
        <PageHeader title="Acquisition" subtitle="Le parcours de tes prospects, du commentaire au client" />
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)", fontSize: 13, padding: "40px 0" }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Chargement…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 28 }}>
        <PageHeader title="Acquisition" subtitle="Le parcours de tes prospects, du commentaire au client" />
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", background: "rgba(232,160,144,0.1)", border: "1px solid rgba(232,160,144,0.3)", borderRadius: 10, color: "#7A3028", fontSize: 13 }}>
          <AlertCircle size={15} /> {error}
        </div>
      </div>
    );
  }

  if (!data || data.totalPeople === 0) {
    return (
      <div style={{ padding: 28 }}>
        <PageHeader title="Acquisition" subtitle="Le parcours de tes prospects, du commentaire au client" />
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: 13, border: "1px dashed var(--border-color)", borderRadius: 12 }}>
          Aucune donnée d&apos;acquisition pour l&apos;instant.<br />
          Dès que ManyChat enverra des événements au webhook, les parcours apparaîtront ici.
        </div>
      </div>
    );
  }

  // Entonnoir cumulatif (les particuliers sont écartés après le guide → comptés à part).
  // On affiche toujours toutes les étapes, même à 0, pour garder le funnel de référence complet.
  // "call_done" est absorbé dans le suivi CRM : on ne le montre pas comme étape distincte ici.
  const funnelOrder = ["comment", "dm", "subscribed", "email_captured", "guide_sent", "company", "call_booked", "client"];
  const steps: FunnelStepV2[] = funnelOrder
    .map((k) => ({ key: k, label: STAGE_LABELS[k], value: data.funnel[k] ?? 0, color: STAGE_COLORS[k] }));

  const clients = data.funnel.client ?? 0;
  const calls = data.funnel.call_booked ?? 0;

  return (
    <div style={{ padding: 28 }}>
      <PageHeader
        title="Acquisition"
        subtitle="Le parcours de tes prospects, du commentaire au client"
        action={<span style={{ fontSize: 11, color: "var(--text-muted)" }}>Maj {new Date(data.updatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
      />

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
        <KpiCard accent="lavender" title="Personnes suivies" value={fmtNum(data.totalPeople)} icon={<Users size={16} />} />
        <KpiCard accent="yellow" title="Calls générés" value={fmtNum(calls)} icon={<PhoneCall size={16} />} />
        <KpiCard accent="sage" title="Clients signés" value={fmtNum(clients)} icon={<UserCheck size={16} />} />
        <KpiCard accent="coral" title="Délai moyen → call" value={data.avgDaysToCall !== null ? `${data.avgDaysToCall} j` : "—"} sub="du 1er contact au call" icon={<Clock size={16} />} />
      </div>

      {/* Entonnoir */}
      <Panel title="Entonnoir d'acquisition" style={{ marginBottom: 18, padding: "0 0 24px" }}>
        <div style={{ padding: "0 24px" }}>
          <FunnelChartV2 steps={steps} />
          {data.individualsCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, padding: "10px 14px", background: "rgba(216,210,196,0.18)", border: "1px dashed var(--border-color)", borderRadius: 10, fontSize: 12, color: "var(--text-secondary)" }}>
              <span style={{ fontSize: 15 }}>↳</span>
              <span><strong style={{ color: "var(--text-primary)" }}>{fmtNum(data.individualsCount)} particulier{data.individualsCount > 1 ? "s" : ""}</strong> écarté{data.individualsCount > 1 ? "s" : ""} après le guide (hors cible entreprise, non comptés dans les conversions).</span>
            </div>
          )}
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18, alignItems: "start" }}>
        {/* Performance par vidéo */}
        <Panel title="Vidéos les plus performantes" padding="20px">
          <div style={{ padding: "12px 20px 4px" }}>
            {data.videos.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Pas encore de vidéo identifiée.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 46px 46px 46px 64px", gap: 8, fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px", paddingBottom: 6, borderBottom: "1px solid var(--border-color)" }}>
                  <span>Vidéo</span><span style={{ textAlign: "right" }}>Contacts</span><span style={{ textAlign: "right" }}>Calls</span><span style={{ textAlign: "right" }}>Clients</span><span style={{ textAlign: "right" }}>CA</span>
                </div>
                {data.videos.map((v) => (
                  <div key={v.flow} style={{ display: "grid", gridTemplateColumns: "1fr 46px 46px 46px 64px", gap: 8, fontSize: 12, padding: "8px 0", borderBottom: "1px solid var(--border-color)", alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden" }}>
                      <Play size={11} style={{ flexShrink: 0, color: "var(--text-muted)" }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.label}</span>
                    </span>
                    <span style={{ textAlign: "right", color: "var(--text-secondary)" }}>{v.people}</span>
                    <span style={{ textAlign: "right", color: "var(--text-secondary)" }}>{v.calls}</span>
                    <span style={{ textAlign: "right", fontWeight: 700, color: v.clients > 0 ? "#2E5E28" : "var(--text-muted)" }}>{v.clients}</span>
                    <span style={{ textAlign: "right", fontWeight: 700, color: v.revenue > 0 ? "#2E5E28" : "var(--text-muted)" }}>{v.revenue > 0 ? `${fmtNum(v.revenue)}€` : "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {/* Liens manuels à faire */}
        <ManualLinkPanel unlinked={data.unlinked} onLinked={load} />
      </div>

      {/* Parcours nominatifs */}
      <Panel title={`Parcours (${data.journeys.length})`} padding="20px">
        <div style={{ padding: "12px 20px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
          {data.journeys.map((j) => <JourneyRow key={j.key} j={j} />)}
        </div>
      </Panel>
    </div>
  );
}

function JourneyRow({ j }: { j: Journey }) {
  const [open, setOpen] = useState(false);
  const stageColor = STAGE_COLORS[j.stage] ?? "#B8B0E8";

  return (
    <div style={{ border: "1px solid var(--border-color)", borderRadius: 10, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{j.name ?? (j.handle ? `@${j.handle}` : "Inconnu")}</span>
            {j.handle && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>@{j.handle}</span>}
            {j.linkedManually && <span title="Relié manuellement" style={{ fontSize: 9, fontWeight: 700, color: "#3E3680", background: "rgba(184,176,232,0.2)", borderRadius: 4, padding: "1px 5px" }}>lié</span>}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {j.firstVideo ? `Via « ${j.firstVideo} »` : "Vidéo inconnue"} · 1er contact {fmtDate(j.firstTouchAt)}
            {j.daysToCall !== null && ` · call en ${j.daysToCall} j`}
          </div>
        </div>
        {j.dealAmount ? <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 12, fontWeight: 700, color: "#2E5E28" }}><Euro size={11} />{fmtNum(j.dealAmount)}</span> : null}
        {j.segment && j.stage !== "company" && j.stage !== "individual" && (
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px", color: j.segment === "company" ? "#2E5E28" : "var(--text-muted)", background: j.segment === "company" ? "rgba(168,197,160,0.2)" : "rgba(216,210,196,0.3)", border: `1px solid ${j.segment === "company" ? "rgba(168,197,160,0.4)" : "var(--border-color)"}`, borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" }}>
            {j.segment === "company" ? "Entreprise" : "Particulier"}
          </span>
        )}
        <span style={{ fontSize: 10, fontWeight: 700, color: "#1C1C1E", background: stageColor, borderRadius: 5, padding: "3px 8px", whiteSpace: "nowrap" }}>{STAGE_LABELS[j.stage] ?? j.stage}</span>
        <ChevronDown size={14} style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ padding: "4px 12px 12px 12px", borderTop: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 8 }}>
            {j.events.map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingBottom: i < j.events.length - 1 ? 12 : 0, position: "relative" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--surface-2, #F5F2EE)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                    {e.type === "comment" ? <MessageCircle size={11} /> : e.type === "guide_sent" ? <FileText size={11} /> : e.type === "email_captured" ? <Mail size={11} /> : <MessageCircle size={11} />}
                  </div>
                  {i < j.events.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 12, background: "var(--border-color)" }} />}
                </div>
                <div style={{ paddingTop: 2 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{STAGE_LABELS[e.type] ?? e.type}{e.video ? ` · ${e.video}` : ""}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{new Date(e.at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            ))}
            {j.callBookedAt && <TimelinePoint icon={<PhoneCall size={11} />} label="Call réservé" date={j.callBookedAt} />}
            {j.clientSince && <TimelinePoint icon={<UserCheck size={11} />} label="Devenu client" date={j.clientSince} last />}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelinePoint({ icon, label, date, last }: { icon: React.ReactNode; label: string; date: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 12 }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(168,197,160,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2E5E28", flexShrink: 0 }}>{icon}</div>
      <div style={{ paddingTop: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{fmtDate(date)}</div>
      </div>
    </div>
  );
}

function ManualLinkPanel({ unlinked, onLinked }: { unlinked: Unlinked[]; onLinked: () => void }) {
  const [active, setActive] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function link(handle: string) {
    if (!email.trim()) return;
    setSaving(true);
    await fetch("/api/acquisition", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle, email }) });
    setSaving(false); setActive(null); setEmail(""); onLinked();
  }

  return (
    <Panel title="À relier manuellement" padding="20px">
      <div style={{ padding: "12px 20px 4px" }}>
        {unlinked.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#2E5E28" }}>
            <Check size={14} /> Tout le monde est relié — rien à faire.
          </div>
        ) : (
          <>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
              Ces personnes sont arrivées sans email. Relie-les à leur email Cal.com pour compléter leur parcours.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {unlinked.map((u) => (
                <div key={u.key} style={{ border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{u.name ?? `@${u.handle}`}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>@{u.handle} · {u.firstVideo ?? "—"}</div>
                    </div>
                    {active !== u.handle && (
                      <button onClick={() => { setActive(u.handle); setEmail(""); }}
                        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#3E3680", background: "rgba(184,176,232,0.15)", border: "1px solid rgba(184,176,232,0.4)", borderRadius: 6, padding: "5px 9px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                        <Link2 size={11} /> Relier
                      </button>
                    )}
                  </div>
                  {active === u.handle && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && u.handle && link(u.handle)} autoFocus placeholder="email@client.com"
                        style={{ flex: 1, padding: "6px 9px", border: "1px solid var(--border-color)", borderRadius: 7, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
                      <button onClick={() => u.handle && link(u.handle)} disabled={saving}
                        style={{ padding: "6px 12px", background: "var(--text-primary)", color: "#FFF", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                        {saving ? "…" : "OK"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}
