import { type ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: string;
  sub?: string;
  badge?: string;
  badgePositive?: boolean;
  accent: "sage" | "yellow" | "lavender" | "coral";
  icon?: ReactNode;
  children?: ReactNode;
}

const accentMap = {
  sage: { bg: "var(--sage-light)", color: "var(--sage)", text: "#2E5E28" },
  yellow: { bg: "var(--yellow-light)", color: "var(--yellow)", text: "#7A5E10" },
  lavender: { bg: "var(--lavender-light)", color: "var(--lavender)", text: "#3E3680" },
  coral: { bg: "var(--coral-light)", color: "var(--coral)", text: "#7A3028" },
};

export default function KpiCard({
  title,
  value,
  sub,
  badge,
  badgePositive = true,
  accent,
  icon,
  children,
}: KpiCardProps) {
  const colors = accentMap[accent];

  return (
    <div
      style={{
        background: colors.bg,
        borderRadius: "var(--radius-card)",
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: colors.text,
            opacity: 0.7,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {title}
        </span>
        {badge && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: badgePositive ? "#2E5E28" : "#7A3028",
              background: badgePositive ? "rgba(168,197,160,0.3)" : "rgba(232,160,144,0.3)",
              padding: "2px 8px",
              borderRadius: 20,
            }}
          >
            {badge}
          </span>
        )}
        {icon && (
          <div style={{ color: colors.color, opacity: 0.8 }}>{icon}</div>
        )}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: colors.text,
          letterSpacing: "-0.5px",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: colors.text, opacity: 0.65 }}>{sub}</div>
      )}
      {children}
    </div>
  );
}
