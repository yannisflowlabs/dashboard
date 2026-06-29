"use client";

interface BarChartProps {
  data: { label: string; value: number; highlight?: boolean }[];
  height?: number;
  accentColor?: string;
  baseColor?: string;
}

export default function BarChart({
  data,
  height = 120,
  accentColor = "var(--sage)",
  baseColor = "#E8E4DC",
}: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height }}>
      {data.map((d, i) => {
        const barH = Math.round((d.value / max) * (height - 28));
        return (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
              height: "100%",
              justifyContent: "flex-end",
            }}
          >
            {d.highlight && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#2E5E28",
                }}
              >
                {d.value > 0 ? `€${(d.value / 1000).toFixed(1)}k` : ""}
              </span>
            )}
            <div
              style={{
                width: "100%",
                height: barH,
                background: d.highlight ? accentColor : baseColor,
                borderRadius: "6px 6px 3px 3px",
                minHeight: d.value > 0 ? 4 : 0,
                transition: "height 0.3s ease",
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: d.highlight ? "var(--text-primary)" : "var(--text-muted)",
              }}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
