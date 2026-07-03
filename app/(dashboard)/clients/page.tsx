"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Video, FileText, Sparkles, Plus, X, Check, Trash2,
  Building2, Loader2, ExternalLink, ChevronRight, Link2,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";

interface Call {
  id: number;
  title: string | null;
  callDate: string;
  recordingUrl: string | null;
  transcriptUrl: string | null;
  hasTranscript: boolean;
  notes: string | null;
}
interface Action {
  id: number;
  label: string;
  done: boolean;
  callId: number | null;
}
interface Business {
  company: string | null;
  industry: string | null;
  dealAmount: number | null;
  signedAt: string | null;
}
interface Client {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  calls: Call[];
  actions: Action[];
  business: Business | null;
}
interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
  webViewLink: string;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ callId: number; clientEmail: string; title: string | null; excerpt: string }[]>([]);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    try {
      const [clientsRes, googleRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/google/status"),
      ]);
      const data = await clientsRes.json();
      setClients(data.clients ?? []);
      if (!selectedEmail && data.clients?.length) setSelectedEmail(data.clients[0].email);
      const gData = await googleRes.json();
      setGoogleConnected(gData.connected ?? false);
    } finally {
      setLoading(false);
    }
  }, [selectedEmail]);

  useEffect(() => { load(); }, [load]);

  // Recherche dans les transcripts (debounce)
  useEffect(() => {
    if (search.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/clients/search?q=${encodeURIComponent(search)}`);
      const data = await res.json();
      setSearchResults(data.results ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Lire ?google=connected|error dans l'URL après callback OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const g = params.get("google");
    if (g) {
      if (g === "connected") setGoogleConnected(true);
      window.history.replaceState({}, "", "/clients");
    }
  }, []);

  const selected = clients.find((c) => c.email === selectedEmail) ?? null;

  return (
    <div style={{ padding: "28px", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      <PageHeader
        title="Suivi clients"
        subtitle="Recordings, transcripts, notes et actions par client"
      />

      {/* Bandeau Google Drive */}
      {googleConnected === false && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", background: "rgba(66,133,244,0.08)",
          border: "1px solid rgba(66,133,244,0.25)", borderRadius: 10, marginBottom: 16, fontSize: 13,
        }}>
          <span style={{ color: "#1A56B0", display: "flex", alignItems: "center", gap: 7 }}>
            <Link2 size={14} /> Connecte Google Drive pour importer les transcripts automatiquement
          </span>
          <a href="/api/auth/google" style={{ ...primaryBtnStyle, fontSize: 12, padding: "6px 12px", textDecoration: "none" }}>
            Connecter Google
          </a>
        </div>
      )}
      {googleConnected === true && (
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "8px 14px", background: "rgba(46,94,40,0.07)",
          border: "1px solid rgba(46,94,40,0.2)", borderRadius: 10, marginBottom: 16, fontSize: 12,
          color: "#2E5E28",
        }}>
          <Check size={13} /> Google Drive connecté — import automatique des transcripts disponible
        </div>
      )}

      {/* Recherche transcripts */}
      <div style={{ position: "relative", marginBottom: 18, maxWidth: 480 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: 11, color: "var(--text-muted)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un mot dans tous les transcripts…"
          style={{
            width: "100%", padding: "9px 12px 9px 36px", border: "1px solid var(--border-color)",
            borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none",
            background: "#FFF", color: "var(--text-primary)", boxSizing: "border-box",
          }}
        />
        {searchResults.length > 0 && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30,
            background: "#FFF", borderRadius: 10, border: "1px solid var(--border-color)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)", maxHeight: 300, overflowY: "auto",
          }}>
            {searchResults.map((r) => (
              <button key={r.callId}
                onClick={() => { setSelectedEmail(r.clientEmail); setSearch(""); }}
                style={{
                  display: "block", width: "100%", textAlign: "left", padding: "10px 12px",
                  border: "none", borderBottom: "1px solid var(--border-color)", background: "transparent",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{r.clientEmail} · {r.title ?? "Call"}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{r.excerpt}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)", fontSize: 13, padding: "40px 0" }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Chargement…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : clients.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: 13, border: "1px dashed var(--border-color)", borderRadius: 12 }}>
          Aucun client pour l&apos;instant. Passe un prospect au stage «&nbsp;Client&nbsp;» dans le CRM pour le voir apparaître ici.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 18, flex: 1, minHeight: 0 }}>
          {/* Liste clients */}
          <div style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
            {clients.map((c) => {
              const openActions = c.actions.filter((a) => !a.done).length;
              const isSel = c.email === selectedEmail;
              return (
                <button key={c.email} onClick={() => setSelectedEmail(c.email)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                    borderRadius: 10, border: `1px solid ${isSel ? "var(--text-primary)" : "var(--border-color)"}`,
                    background: isSel ? "var(--text-primary)" : "#FFF", cursor: "pointer",
                    textAlign: "left", fontFamily: "inherit", width: "100%",
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: isSel ? "rgba(255,255,255,0.2)" : "var(--surface-2, #F5F2EE)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, color: isSel ? "#FFF" : "var(--text-primary)",
                  }}>{getInitials(c.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isSel ? "#FFF" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: isSel ? "rgba(255,255,255,0.7)" : "var(--text-muted)" }}>
                      {c.calls.length} call{c.calls.length > 1 ? "s" : ""}{openActions > 0 ? ` · ${openActions} action${openActions > 1 ? "s" : ""}` : ""}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: isSel ? "rgba(255,255,255,0.7)" : "var(--text-muted)", flexShrink: 0 }} />
                </button>
              );
            })}
          </div>

          {/* Détail client */}
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto", paddingRight: 4 }}>
            {selected && <ClientDetail client={selected} onRefresh={load} googleConnected={googleConnected ?? false} />}
          </div>
        </div>
      )}
    </div>
  );
}

function ClientDetail({ client, onRefresh, googleConnected }: { client: Client; onRefresh: () => void; googleConnected: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{client.name}</h2>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{client.email}{client.phone ? ` · ${client.phone}` : ""}</div>
      </div>

      <BusinessCard client={client} onRefresh={onRefresh} />
      <ActionsCard client={client} onRefresh={onRefresh} />
      <CallsCard client={client} onRefresh={onRefresh} googleConnected={googleConnected} />
    </div>
  );
}

function BusinessCard({ client, onRefresh }: { client: Client; onRefresh: () => void }) {
  const b = client.business;
  const [editing, setEditing] = useState(false);
  const [company, setCompany] = useState(b?.company ?? "");
  const [industry, setIndustry] = useState(b?.industry ?? "");
  const [dealAmount, setDealAmount] = useState(b?.dealAmount?.toString() ?? "");
  const [signedAt, setSignedAt] = useState(b?.signedAt ? b.signedAt.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/clients/business", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientEmail: client.email, company, industry, dealAmount, signedAt }),
    });
    setSaving(false); setEditing(false); onRefresh();
  }

  const inputStyle = { padding: "7px 10px", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Building2 size={14} /> Infos business</span>
        {!editing && <button onClick={() => setEditing(true)} style={linkBtnStyle}>Éditer</button>}
      </div>
      {editing ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input style={inputStyle} placeholder="Entreprise" value={company} onChange={(e) => setCompany(e.target.value)} />
          <input style={inputStyle} placeholder="Secteur" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          <input style={inputStyle} type="number" placeholder="Montant deal (€)" value={dealAmount} onChange={(e) => setDealAmount(e.target.value)} />
          <input style={inputStyle} type="date" value={signedAt} onChange={(e) => setSignedAt(e.target.value)} />
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 6 }}>
            <button onClick={save} disabled={saving} style={primaryBtnStyle}>{saving ? "…" : "Enregistrer"}</button>
            <button onClick={() => setEditing(false)} style={secondaryBtnStyle}>Annuler</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px", fontSize: 12 }}>
          <InfoLine label="Entreprise" value={b?.company} />
          <InfoLine label="Secteur" value={b?.industry} />
          <InfoLine label="Montant deal" value={b?.dealAmount ? `${b.dealAmount.toLocaleString("fr-FR")} €` : null} />
          <InfoLine label="Signé le" value={b?.signedAt ? formatDate(b.signedAt) : null} />
        </div>
      )}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span style={{ color: "var(--text-muted)" }}>{label} : </span>
      <span style={{ color: value ? "var(--text-primary)" : "var(--text-muted)", fontWeight: value ? 600 : 400 }}>{value ?? "—"}</span>
    </div>
  );
}

function ActionsCard({ client, onRefresh }: { client: Client; onRefresh: () => void }) {
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  async function toggle(id: number, done: boolean) {
    await fetch("/api/clients/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, done: !done }) });
    onRefresh();
  }
  async function add() {
    if (!newLabel.trim()) return;
    setAdding(true);
    await fetch("/api/clients/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientEmail: client.email, label: newLabel.trim() }) });
    setNewLabel(""); setAdding(false); onRefresh();
  }
  async function del(id: number) {
    await fetch(`/api/clients/actions?id=${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} /> Actions à faire</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {client.actions.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Aucune action pour l&apos;instant.</div>}
        {client.actions.map((a) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => toggle(a.id, a.done)}
              style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: "pointer",
                border: `1.5px solid ${a.done ? "#2E5E28" : "var(--border-color)"}`,
                background: a.done ? "#A8C5A0" : "#FFF", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >{a.done && <Check size={12} color="#2E5E28" />}</button>
            <span style={{ flex: 1, fontSize: 13, color: a.done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: a.done ? "line-through" : "none" }}>{a.label}</span>
            <button onClick={() => del(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", opacity: 0.5, padding: 2 }}><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nouvelle action…"
          style={{ flex: 1, padding: "7px 10px", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
        <button onClick={add} disabled={adding} style={{ ...primaryBtnStyle, padding: "7px 12px" }}><Plus size={13} /></button>
      </div>
    </div>
  );
}

function CallsCard({ client, onRefresh, googleConnected }: { client: Client; onRefresh: () => void; googleConnected: boolean }) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Video size={14} /> Historique des calls</span>
        <button onClick={() => setShowAdd(!showAdd)} style={linkBtnStyle}>{showAdd ? "Fermer" : "+ Ajouter"}</button>
      </div>
      {showAdd && <AddCallForm client={client} onDone={() => { setShowAdd(false); onRefresh(); }} googleConnected={googleConnected} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: showAdd ? 12 : 0 }}>
        {client.calls.length === 0 && !showAdd && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Aucun call enregistré.</div>}
        {client.calls.map((call) => <CallItem key={call.id} call={call} onRefresh={onRefresh} />)}
      </div>
    </div>
  );
}

function AddCallForm({ client, onDone, googleConnected }: { client: Client; onDone: () => void; googleConnected: boolean }) {
  const [title, setTitle] = useState("");
  const [recordingUrl, setRecordingUrl] = useState("");
  const [transcriptUrl, setTranscriptUrl] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [saving, setSaving] = useState(false);

  // Drive search state
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveSearched, setDriveSearched] = useState(false);
  const [importingDoc, setImportingDoc] = useState<string | null>(null);

  async function searchDrive() {
    const firstName = client.name.split(" ")[0];
    setDriveLoading(true); setDriveSearched(true);
    const res = await fetch(`/api/google/drive?q=${encodeURIComponent(firstName)}`);
    const data = await res.json();
    setDriveFiles(data.files ?? []);
    setDriveLoading(false);
  }

  async function importTranscript(file: DriveFile) {
    setImportingDoc(file.id);
    setTranscriptUrl(file.webViewLink);
    if (!title) setTitle(file.name);
    const res = await fetch(`/api/google/docs?docId=${file.id}`);
    const data = await res.json();
    if (data.transcript) setTranscriptText(data.transcript);
    setImportingDoc(null);
  }

  async function save() {
    setSaving(true);
    await fetch("/api/clients/calls", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientEmail: client.email, title, recordingUrl, transcriptUrl, transcriptText }),
    });
    setSaving(false); onDone();
  }

  const inputStyle = { padding: "7px 10px", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "var(--surface-2, #F9F7F4)", borderRadius: 8 }}>
      <input style={inputStyle} placeholder="Titre du call (ex: Call découverte)" value={title} onChange={(e) => setTitle(e.target.value)} />

      {/* Import Google Drive */}
      {googleConnected && (
        <div>
          <button onClick={searchDrive} disabled={driveLoading}
            style={{ ...secondaryBtnStyle, display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            {driveLoading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={12} />}
            Rechercher dans Drive ({client.name.split(" ")[0]})
          </button>
          {driveSearched && !driveLoading && driveFiles.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Aucun fichier trouvé pour «&nbsp;{client.name.split(" ")[0]}&nbsp;».</div>
          )}
          {driveFiles.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
              {driveFiles.map((f) => (
                <div key={f.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "7px 10px", background: "#FFF", border: "1px solid var(--border-color)", borderRadius: 8,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{formatDate(f.createdTime)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                    <a href={f.webViewLink} target="_blank" rel="noreferrer" style={{ ...chipStyle, fontSize: 10 }}><ExternalLink size={10} /></a>
                    <button onClick={() => importTranscript(f)} disabled={importingDoc === f.id}
                      style={{ ...primaryBtnStyle, padding: "4px 10px", fontSize: 11 }}>
                      {importingDoc === f.id ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : "Importer"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <input style={inputStyle} placeholder="Lien recording Drive (optionnel)" value={recordingUrl} onChange={(e) => setRecordingUrl(e.target.value)} />
      <input style={inputStyle} placeholder="Lien transcript Google Doc (optionnel)" value={transcriptUrl} onChange={(e) => setTranscriptUrl(e.target.value)} />
      <textarea style={{ ...inputStyle, height: 80, resize: "none" }} placeholder="Coller le texte du transcript ici (ou utiliser l'import Drive ci-dessus)" value={transcriptText} onChange={(e) => setTranscriptText(e.target.value)} />
      <button onClick={save} disabled={saving} style={primaryBtnStyle}>{saving ? "Enregistrement…" : "Ajouter le call"}</button>
    </div>
  );
}

function CallItem({ call, onRefresh }: { call: Call; onRefresh: () => void }) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  async function generate() {
    setGenerating(true); setGenError(null);
    const res = await fetch("/api/clients/generate-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callId: call.id }) });
    const data = await res.json();
    setGenerating(false);
    if (data.error) setGenError(data.error);
    else { setShowNotes(true); onRefresh(); }
  }
  async function del() {
    await fetch(`/api/clients/calls?id=${call.id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div style={{ border: "1px solid var(--border-color)", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{call.title ?? "Call"}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDate(call.callDate)}</div>
        </div>
        <button onClick={del} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", opacity: 0.5 }}><Trash2 size={13} /></button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: call.notes || genError ? 10 : 0 }}>
        {call.recordingUrl && <a href={call.recordingUrl} target="_blank" rel="noreferrer" style={chipStyle}><Video size={12} /> Recording <ExternalLink size={10} /></a>}
        {call.transcriptUrl && <a href={call.transcriptUrl} target="_blank" rel="noreferrer" style={chipStyle}><FileText size={12} /> Transcript <ExternalLink size={10} /></a>}
        {call.hasTranscript && (
          <button onClick={generate} disabled={generating} style={{ ...chipStyle, cursor: "pointer", border: "1px solid rgba(184,176,232,0.5)", background: "rgba(184,176,232,0.12)", color: "#3E3680" }}>
            {generating ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={12} />}
            {call.notes ? "Regénérer les notes" : "Générer les notes"}
          </button>
        )}
        {call.notes && <button onClick={() => setShowNotes(!showNotes)} style={{ ...chipStyle, cursor: "pointer" }}>{showNotes ? "Masquer" : "Voir"} les notes</button>}
      </div>
      {genError && <div style={{ fontSize: 11, color: "#7A3028", background: "rgba(232,160,144,0.12)", padding: "6px 8px", borderRadius: 6 }}>{genError}</div>}
      {call.notes && showNotes && (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, background: "var(--surface-2, #F9F7F4)", borderRadius: 8, padding: "10px 12px", whiteSpace: "pre-wrap" }}>{call.notes}</div>
      )}
    </div>
  );
}

// Styles partagés
const cardStyle: React.CSSProperties = { background: "#FFF", border: "1px solid var(--border-color)", borderRadius: 12, padding: 16 };
const cardHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 };
const linkBtnStyle: React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", cursor: "pointer", background: "none", border: "none", textDecoration: "underline", padding: 0, fontFamily: "inherit" };
const primaryBtnStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px 14px", background: "var(--text-primary)", color: "#FFF", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const secondaryBtnStyle: React.CSSProperties = { padding: "8px 14px", background: "none", color: "var(--text-muted)", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "inherit" };
const chipStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, border: "1px solid var(--border-color)", background: "#FFF", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textDecoration: "none", fontFamily: "inherit" };
