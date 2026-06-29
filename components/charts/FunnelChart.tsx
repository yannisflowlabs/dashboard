"use client";

interface FunnelStep {
  label: string;
  value: number;
  sub?: string;
  color: string;
}

interface FunnelChartProps {
  steps: FunnelStep[];
}

export default function FunnelChart({ steps }: FunnelChartProps) {
  const max = steps[0]?.value || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {steps.map((step, i) => {
        const pct = Math.round((step.value / max) * 100);
        const convRate =
          i > 0 && steps[i - 1].value > 0
            ? Math.round((step.value / steps[i - 1].value) * 100)
            : null;

        return (
          <div key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  width: 160,
                  flexShrink: 0,
                }}
              >
                {step.label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 28,
                  background: "#F0EDE8",
                  borderRadius: 8,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: step.color,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 10,
                    transition: "width 0.5s ease",
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#1C1C1E", whiteSpace: "nowrap" }}>
                    {step.value}
                  </span>
                </div>
              </div>
              {convRate !== null && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    width: 40,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {convRate}%
                </span>
              )}
            </div>
            {step.sub && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", paddingLeft: 172 }}>
                {step.sub}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
