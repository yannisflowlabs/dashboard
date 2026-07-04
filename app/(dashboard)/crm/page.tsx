"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, ChevronDown, User, Mail, Phone, FileText, Trash2, Loader2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import PeriodSelector, { yearToDate, type Period } from "@/components/ui/PeriodSelector";

type Stage = "prospect" | "call_booked" | "proposal_sent" | "client" | "lost" | "unqualified";

interface Prospect {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  source: string;
  stage: Stage;
  notes: string | null;
  calBookingUid: string | null;
  clientSince: string | null;
  stageUpdatedAt: string | null;
  createdAt: string;
}

const STAGES: { key: Stage; label: string; color: string; bg: string; border: string }[] = [
  { key: "prospect",       label: "Prospect",            color: "#5A5A5A", bg: "#F5F2EE",                  border: "#E0D8CF" },
  { key: "call_booked",   label: "Call booké",           color: "#3E3680", bg: "rgba(184,176,232,0.12)",   border: "rgba(184,176,232,0.4)" },
  { key: "proposal_sent", label: "Proposition envoyée",  color: "#7A5E10", bg: "rgba(240,200,96,0.12)",    border: "rgba(240,200,96,0.4)" },
  { key: "client",        label: "Client",               color: "#2E5E28", bg: "rgba(168,197,160,0.15)",   border: "rgba(168,197,160,0.5)" },
  { key: "lost",          label: "Perdu",                color: "#7A3028", bg: "rgba(232,160,144,0.12)",   border: "rgba(232,160,144,0.4)" },
  { key: "unqualified",   label: "Non qualifié",         color: "#5A5A5A", bg: "rgba(150,150,150,0.10)",   border: "rgba(150,150,150,0.35)" },
];

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

function ProspectCard({ prospect, onStageChange, onDelete, onEdit, onDragStart, onClientSinceChange, onStageUpdatedAtChange }: {
  prospect: Prospect;
  onStageChange: (id: number, stage: Stage) => void;
  onDelete: (id: number) => void;
  onEdit: (prospect: Prospect) => void;
  onDragStart: (id: number) => void;
  onClientSinceChange: (id: number, date: string | null) => void;
  onStageUpdatedAtChange: (id: number, date: string | null) => void;
}) {
  const [stageOpen, setStageOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const stage = STAGES.find(s => s.key === prospect.stage)!;

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragging(true); onDragStart(prospect.id); }}
      onDragEnd={() => setDragging(false)}
      onClick={() => onEdit(prospect)}
      style={{
        background: "#FFF", borderRadius: 12, padding: "14px",
        border: "1px solid var(--border-color)",
        boxShadow: dragging ? "0 8px 24px rgba(0,0,0,0.15)" : "0 1px 4px rgba(0,0,0,0.05)",
        cursor: "grab", position: "relative",
        opacity: dragging ? 0.5 : 1,
        transform: dragging ? "rotate(1deg)" : "none",
        transition: "box-shadow 0.15s, opacity 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
          background: stage.bg, border: `1px solid ${stage.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, color: stage.color,
        }}>
          {getInitials(prospect.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
            {prospect.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {prospect.email}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(prospect.id); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, flexShrink: 0, opacity: 0.5 }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {prospect.notes && (
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.5, background: "#F9F7F4", borderRadius: 8, padding: "6px 8px" }}>
          {prospect.notes.slice(0, 80)}{prospect.notes.length > 80 ? "…" : ""}
        </div>
      )}

      <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setStageOpen(!stageOpen)}
          style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "4px 10px", borderRadius: 20, width: "100%",
            border: `1px solid ${stage.border}`, background: stage.bg,
            color: stage.color, cursor: "pointer", fontSize: 11, fontWeight: 600,
            fontFamily: "inherit", justifyContent: "space-between",
          }}
        >
          {stage.label} <ChevronDown size={10} />
        </button>
        {stageOpen && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setStageOpen(false)} />
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
              background: "#FFF", borderRadius: 10, border: "1px solid var(--border-color)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)", overflow: "hidden",
            }}>
              {STAGES.map(s => (
                <button key={s.key} onClick={() => { onStageChange(prospect.id, s.key); setStageOpen(false); }}
                  style={{
                    display: "block", width: "100%", padding: "8px 12px", textAlign: "left",
                    border: "none", background: prospect.stage === s.key ? s.bg : "transparent",
                    color: s.color, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
        {prospect.stage === "client" ? (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>
              Date de signature
            </div>
            <input
              type="date"
              value={prospect.clientSince ? prospect.clientSince.slice(0, 10) : ""}
              onChange={(e) => onClientSinceChange(prospect.id, e.target.value || null)}
              style={{ width: "100%", padding: "5px 8px", fontSize: 12, border: "1px solid var(--border-color)", borderRadius: 8, fontFamily: "inherit", color: "var(--text-primary)", background: "rgba(168,197,160,0.1)", boxSizing: "border-box" as const }}
            />
          </>
        ) : (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>
              Date dans ce stage
            </div>
            <input
              type="date"
              value={prospect.stageUpdatedAt ? prospect.stageUpdatedAt.slice(0, 10) : ""}
              onChange={(e) => onStageUpdatedAtChange(prospect.id, e.target.value || null)}
              style={{ width: "100%", padding: "5px 8px", fontSize: 12, border: "1px solid var(--border-color)", borderRadius: 8, fontFamily: "inherit", color: "var(--text-primary)", background: "var(--bg-cream)", boxSizing: "border-box" as const }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function AddProspectModal({ onClose, onAdd }: { onClose: () => void; onAdd: (p: Partial<Prospect>) => Promise<void> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onAdd({ name, email, phone: phone || undefined, notes: notes || undefined, source: "manual", stage: "prospect" });
    setSaving(false);
    onClose();
  };

  const inputStyle = {
    width: "100%", padding: "9px 12px", border: "1px solid var(--border-color)",
    borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none",
    background: "#FFF", color: "var(--text-primary)", boxSizing: "border-box" as const,
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100 }} onClick={onClose} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 101,
        background: "#FFF", borderRadius: 16, padding: "24px", width: 400,
        boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Nouveau prospect</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <User size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input style={inputStyle} placeholder="Nom complet *" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Mail size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input style={inputStyle} type="email" placeholder="Email *" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Phone size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input style={inputStyle} placeholder="Téléphone (optionnel)" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <FileText size={13} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 10 }} />
            <textarea style={{ ...inputStyle, resize: "none", height: 80 }} placeholder="Notes (optionnel)" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <button type="submit" disabled={saving}
            style={{ padding: "11px", background: "var(--text-primary)", color: "#FFF", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", marginTop: 4 }}>
            {saving ? "Enregistrement…" : "Ajouter le prospect"}
          </button>
        </form>
      </div>
    </>
  );
}

function EditProspectModal({ prospect, onClose, onSave }: {
  prospect: Prospect;
  onClose: () => void;
  onSave: (id: number, data: Partial<Prospect>) => Promise<void>;
}) {
  const [name, setName] = useState(prospect.name);
  const [phone, setPhone] = useState(prospect.phone ?? "");
  const [notes, setNotes] = useState(prospect.notes ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(prospect.id, { name, phone: phone || undefined, notes: notes || undefined });
    setSaving(false);
    onClose();
  };

  const inputStyle = {
    width: "100%", padding: "9px 12px", border: "1px solid var(--border-color)",
    borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none",
    background: "#FFF", color: "var(--text-primary)", boxSizing: "border-box" as const,
  };

  const stage = STAGES.find(s => s.key === prospect.stage)!;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100 }} onClick={onClose} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 101,
        background: "#FFF", borderRadius: 16, padding: "24px", width: 400,
        boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{prospect.name}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={16} /></button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{prospect.email}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: stage.color, background: stage.bg, padding: "2px 8px", borderRadius: 20, border: `1px solid ${stage.border}` }}>{stage.label}</span>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <User size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input style={inputStyle} placeholder="Nom complet" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Phone size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input style={inputStyle} placeholder="Téléphone" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <FileText size={13} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 10 }} />
            <textarea style={{ ...inputStyle, resize: "none", height: 100 }} placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <button type="submit" disabled={saving}
            style={{ padding: "11px", background: "var(--text-primary)", color: "#FFF", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", marginTop: 4 }}>
            {saving ? "Enregistrement…" : "Sauvegarder"}
          </button>
        </form>
      </div>
    </>
  );
}

export default function CRMPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editProspect, setEditProspect] = useState<Prospect | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  const [period, setPeriod] = useState<Period>(yearToDate());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/prospects");
      const data = await res.json();
      setProspects(data.prospects ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Sync Cal.com then load prospects
    fetch("/api/calcom").then(() => load()).catch(() => load());
  }, [load]);

  const handleAdd = async (data: Partial<Prospect>) => {
    const res = await fetch("/api/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.prospect) setProspects(prev => [json.prospect, ...prev]);
  };

  const handleStageChange = async (id: number, stage: Stage) => {
    const res = await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    const json = await res.json();
    if (json.prospect) setProspects(prev => prev.map(p => p.id === id ? { ...p, ...json.prospect } : p));
  };

  const handleClientSinceChange = async (id: number, date: string | null) => {
    setProspects(prev => prev.map(p => p.id === id ? { ...p, clientSince: date } : p));
    await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientSince: date }),
    });
  };

  const handleStageUpdatedAtChange = async (id: number, date: string | null) => {
    setProspects(prev => prev.map(p => p.id === id ? { ...p, stageUpdatedAt: date } : p));
    await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageUpdatedAt: date }),
    });
  };

  const handleDelete = async (id: number) => {
    setProspects(prev => prev.filter(p => p.id !== id));
    await fetch(`/api/prospects/${id}`, { method: "DELETE" });
  };

  const handleSave = async (id: number, data: Partial<Prospect>) => {
    const res = await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.prospect) setProspects(prev => prev.map(p => p.id === id ? { ...p, ...json.prospect } : p));
  };

  const handleDrop = (stage: Stage) => {
    if (dragId !== null) {
      handleStageChange(dragId, stage);
      setDragId(null);
      setDragOverStage(null);
    }
  };

  // Filtrage par période (date de création du prospect)
  const fromT = new Date(period.from + "T00:00:00").getTime();
  const toT = new Date(period.to + "T23:59:59").getTime();
  const visibleProspects = prospects.filter(p => {
    // Clients → clientSince, autres stages → stageUpdatedAt, fallback createdAt
    const ref = p.stage === "client" && p.clientSince
      ? p.clientSince
      : (p.stageUpdatedAt ?? p.createdAt);
    const t = new Date(ref).getTime();
    return t >= fromT && t <= toT;
  });

  const byStage = (stage: Stage) => visibleProspects.filter(p => p.stage === stage);
  const clients = byStage("client").length;
  const pipeline = visibleProspects.filter(p => !["client", "lost", "unqualified"].includes(p.stage)).length;
  // Taux de conversion calculé hors non qualifiés (ils ne rentraient pas dans la cible)
  const qualified = visibleProspects.filter(p => p.stage !== "unqualified").length;

  return (
    <div style={{ padding: "28px", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      <PageHeader
        title="CRM Pipeline"
        subtitle="Prospects importés depuis Cal.com · Glisse les cartes pour changer de statut"
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PeriodSelector value={period} onChange={setPeriod} />
          <button onClick={() => setShowAdd(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--text-primary)", color: "#FFF", border: "none", borderRadius: "var(--radius-nav)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <Plus size={13} /> Nouveau prospect
          </button>
          </div>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "20px" }}>
        <KpiCard title="Total prospects" value={`${visibleProspects.length}`} sub="Sur la période · tous statuts" accent="sage" />
        <KpiCard title="En pipeline" value={`${pipeline}`} sub="Hors clients, perdus, non qualifiés" accent="lavender" />
        <KpiCard title="Clients" value={`${clients}`} sub="Conversions réussies" accent="yellow" />
        <KpiCard title="Taux de conversion" value={qualified > 0 ? `${Math.round((clients / qualified) * 100)}%` : "—"} sub="Clients / prospects qualifiés" accent="coral" />
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)", fontSize: 13, padding: "40px 0" }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Synchronisation Cal.com…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "12px", flex: 1, overflowX: "auto", paddingBottom: 8 }}>
          {STAGES.map(stage => {
            const cards = byStage(stage.key);
            const isOver = dragOverStage === stage.key && dragId !== null;
            return (
              <div
                key={stage.key}
                onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.key); }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={() => handleDrop(stage.key)}
                style={{ minWidth: 230, width: 230, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: isOver ? stage.border : stage.bg, borderRadius: 10, border: `1px solid ${stage.border}`, transition: "background 0.15s" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: stage.color }}>{stage.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: stage.color, background: "rgba(255,255,255,0.6)", padding: "2px 7px", borderRadius: 20 }}>{cards.length}</span>
                </div>
                <div
                  style={{
                    display: "flex", flexDirection: "column", gap: 8, flex: 1, overflowY: "auto",
                    borderRadius: 10, padding: isOver ? "6px" : "0",
                    border: isOver ? `2px dashed ${stage.border}` : "2px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  {cards.map(p => (
                    <ProspectCard
                      key={p.id}
                      prospect={p}
                      onStageChange={handleStageChange}
                      onDelete={handleDelete}
                      onEdit={setEditProspect}
                      onDragStart={setDragId}
                      onClientSinceChange={handleClientSinceChange}
                      onStageUpdatedAtChange={handleStageUpdatedAtChange}
                    />
                  ))}
                  {cards.length === 0 && (
                    <div style={{ padding: "16px 12px", textAlign: "center", fontSize: 12, color: isOver ? stage.color : "var(--text-muted)", border: `1px dashed ${isOver ? stage.border : "var(--border-color)"}`, borderRadius: 10, transition: "all 0.15s" }}>
                      {isOver ? "Déposer ici" : "Aucun prospect"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddProspectModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
      {editProspect && (
        <EditProspectModal
          prospect={editProspect}
          onClose={() => setEditProspect(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
