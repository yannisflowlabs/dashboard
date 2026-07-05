"use client";

import { useState } from "react";

export interface FunnelStepV2 {
  key: string;
  label: string;
  value: number;
  previous?: number | null; // valeur période précédente (pour évolution)
  goal?: number | null;      // objectif de l'étape
  color: string;
  sub?: string;
}

function formatNum(n: number): string {
  return n.toLocaleString("fr-FR");
}

function formatPct(n: number, digits = 1): string {
  if (n === 0) return "0%";
  if (n < 0.1) return `${n.toFixed(3)}%`;
  if (n < 10) return `${n.toFixed(digits)}%`;
  return `${Math.round(n)}%`;
}

export default function FunnelChartV2({ steps }: { steps: FunnelStepV2[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const top = steps[0]?.value || 1;

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Barres verticales façon Zentra */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 4,
          height: 220,
          position: "relative",
        }}
        onMouseLeave={() => setHovered(null)}
      >
        {steps.map((step, i) => {
          // Hauteur proportionnelle au sommet, avec un plancher visuel pour rester lisible
          const ratio = top > 0 ? step.value / top : 0;
          const heightPct = Math.max(ratio * 100, 8);
          const isHovered = hovered === i;
          const isDimmed = hovered !== null && hovered !== i;

          // Conversion depuis l'étape précédente
          const convRate =
            i > 0 && steps[i - 1].value > 0
              ? (step.value / steps[i - 1].value) * 100
              : null;
          const dropOff = convRate !== null ? 100 - convRate : null;
          const droppedCount =
            i > 0 ? Math.max(steps[i - 1].value - step.value, 0) : 0;

          // Part du sommet
          const shareOfTop = top > 0 ? (step.value / top) * 100 : 0;

          // Évolution vs période précédente
          const prev = step.previous;
          const evolution =
            prev !== undefined && prev !== null && prev > 0
              ? ((step.value - prev) / prev) * 100
              : null;

          return (
            <div
              key={step.key}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                height: "100%",
                justifyContent: "flex-end",
                position: "relative",
                cursor: "pointer",
                opacity: isDimmed ? 0.4 : 1,
                transition: "opacity 0.2s ease",
              }}
              onMouseEnter={() => setHovered(i)}
            >
              {/* Valeur au-dessus de la barre */}
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  marginBottom: 6,
                  letterSpacing: "-0.4px",
                }}
              >
                {formatNum(step.value)}
              </div>

              {/* La barre */}
              <div
                style={{
                  width: "100%",
                  maxWidth: 90,
                  height: `${heightPct}%`,
                  minHeight: 18,
                  background: step.color,
                  borderRadius: "8px 8px 0 0",
                  position: "relative",
                  boxShadow: isHovered
                    ? `0 0 0 2px var(--text-primary)`
                    : "none",
                  transition: "height 0.5s ease, box-shadow 0.2s ease",
                  // Motif diagonal léger façon Zentra
                  backgroundImage:
                    "repeating-linear-gradient(135deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 2px, transparent 2px, transparent 8px)",
                }}
              >
                {/* Tooltip au survol */}
                {isHovered && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "calc(100% + 10px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#1C1C1E",
                      color: "#FFF",
                      borderRadius: 10,
                      padding: "10px 12px",
                      minWidth: 180,
                      zIndex: 20,
                      boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
                      pointerEvents: "none",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      {step.label}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                      <Row label="Valeur" value={formatNum(step.value)} />
                      <Row label="Part du départ" value={formatPct(shareOfTop)} />
                      {convRate !== null && (
                        <Row
                          label="Conversion"
                          value={formatPct(convRate)}
                          valueColor="#A8C5A0"
                        />
                      )}
                      {dropOff !== null && (
                        <Row
                          label="Drop-off"
                          value={`-${formatPct(dropOff)} (${formatNum(droppedCount)})`}
                          valueColor="#E8A090"
                        />
                      )}
                      {evolution !== null && (
                        <Row
                          label="vs période préc."
                          value={`${evolution >= 0 ? "+" : ""}${Math.round(evolution)}%`}
                          valueColor={evolution >= 0 ? "#A8C5A0" : "#E8A090"}
                        />
                      )}
                      {step.goal != null && step.goal > 0 && (
                        <Row
                          label="Objectif"
                          value={`${formatNum(step.value)} / ${formatNum(step.goal)}`}
                          valueColor="#F0C860"
                        />
                      )}
                    </div>
                    {/* Petite flèche du tooltip */}
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 0,
                        height: 0,
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: "6px solid #1C1C1E",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* % de conversion entre cette barre et la précédente (badge flottant) */}
              {convRate !== null && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 0,
                    transform: "translate(-50%, -50%)",
                    background: "#FFF",
                    border: "1px solid var(--border-color)",
                    borderRadius: 20,
                    padding: "2px 7px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    zIndex: 10,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatPct(convRate)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Labels sous les barres */}
      <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
        {steps.map((step, i) => (
          <div
            key={step.key}
            style={{
              flex: 1,
              textAlign: "center",
              opacity: hovered !== null && hovered !== i ? 0.4 : 1,
              transition: "opacity 0.2s ease",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: step.color,
                margin: "0 auto 5px",
              }}
            />
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>
              {step.label}
            </div>
            {step.sub && (
              <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.3 }}>
                {step.sub}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "rgba(255,255,255,0.6)" }}>{label}</span>
      <span style={{ fontWeight: 700, color: valueColor ?? "#FFF" }}>{value}</span>
    </div>
  );
}
