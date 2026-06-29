"use client";

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

export default function DonutChart({
  data,
  size = 120,
  thickness = 22,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  // Build conic-gradient stops
  let cursor = 0;
  const stops = data.map((d) => {
    const pct = (d.value / total) * 100;
    const start = cursor;
    cursor += pct;
    return `${d.color} ${start.toFixed(1)}% ${cursor.toFixed(1)}%`;
  });

  const gradient = `conic-gradient(from -90deg, ${stops.join(", ")})`;
  const inner = size - thickness * 2;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: gradient,
          position: "relative",
          flexShrink: 0,
        }}
      >
        {/* Center hole */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: inner,
            height: inner,
            borderRadius: "50%",
            background: "var(--card-bg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {centerValue && (
            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 500 }}>
              {centerLabel}
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: d.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1 }}>
              {d.label}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
