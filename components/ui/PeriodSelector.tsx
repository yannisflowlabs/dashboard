"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

export interface Period {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  label: string;
}

// Bornes utilitaires
function iso(d: Date) { return d.toISOString().slice(0, 10); }
function monthLabel(d: Date) { return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }); }

export function currentMonthPeriod(): Period {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: iso(start), to: iso(end), label: monthLabel(now) };
}

function shiftMonth(offset: number): Period {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { from: iso(start), to: iso(end), label: monthLabel(start) };
}

function lastNDays(n: number, label: string): Period {
  const end = new Date();
  const start = new Date(Date.now() - (n - 1) * 24 * 60 * 60 * 1000);
  return { from: iso(start), to: iso(end), label };
}

export function yearToDate(): Period {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return { from: iso(start), to: iso(now), label: `Année ${now.getFullYear()}` };
}

function allTime(): Period {
  return { from: "2020-01-01", to: iso(new Date()), label: "Depuis le début" };
}

const PRESETS: { key: string; make: () => Period }[] = [
  { key: "Ce mois-ci", make: currentMonthPeriod },
  { key: "Mois dernier", make: () => shiftMonth(-1) },
  { key: "30 derniers jours", make: () => lastNDays(30, "30 derniers jours") },
  { key: "90 derniers jours", make: () => lastNDays(90, "90 derniers jours") },
  { key: "Cette année", make: yearToDate },
  { key: "Tout", make: allTime },
];

export default function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);

  function applyCustom() {
    if (!customFrom || !customTo) return;
    const label = `${new Date(customFrom + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} → ${new Date(customTo + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`;
    onChange({ from: customFrom, to: customTo, label });
    setOpen(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", border: "1px solid var(--border-color)", borderRadius: 10, background: "#FFF", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
        <Calendar size={15} style={{ color: "var(--text-muted)" }} />
        <span style={{ textTransform: "capitalize" }}>{value.label}</span>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>▾</span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, background: "#FFF", border: "1px solid var(--border-color)", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.12)", padding: 8, minWidth: 240 }}>
            {PRESETS.map((p) => {
              const period = p.make();
              const isActive = period.from === value.from && period.to === value.to;
              return (
                <button key={p.key} onClick={() => { onChange(period); setOpen(false); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 12px", border: "none", borderRadius: 8, background: isActive ? "var(--text-primary)" : "transparent", color: isActive ? "#FFF" : "var(--text-primary)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: isActive ? 700 : 500, textAlign: "left" }}>
                  {p.key}
                  {isActive && <span style={{ fontSize: 11 }}>✓</span>}
                </button>
              );
            })}

            <div style={{ height: 1, background: "var(--border-color)", margin: "8px 4px" }} />

            <div style={{ padding: "4px 8px 8px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>Personnalisé</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                  style={{ padding: "6px 8px", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                  style={{ padding: "6px 8px", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
                <button onClick={applyCustom}
                  style={{ padding: "7px 12px", background: "var(--text-primary)", color: "#FFF", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Appliquer
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
