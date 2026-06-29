import { type ReactNode, type CSSProperties } from "react";

interface PanelProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  padding?: string;
}

export default function Panel({ title, action, children, style, padding = "24px" }: PanelProps) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `18px ${padding} 0`,
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.2px",
            }}
          >
            {title}
          </h3>
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={{ padding }}>{children}</div>
    </div>
  );
}
