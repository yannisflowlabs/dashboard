interface BadgeProps {
  label: string;
  variant?: "sage" | "yellow" | "lavender" | "coral" | "neutral";
}

const variants = {
  sage: { bg: "rgba(168,197,160,0.2)", color: "#2E5E28" },
  yellow: { bg: "rgba(240,200,96,0.2)", color: "#7A5E10" },
  lavender: { bg: "rgba(184,176,232,0.2)", color: "#3E3680" },
  coral: { bg: "rgba(232,160,144,0.2)", color: "#7A3028" },
  neutral: { bg: "rgba(107,107,107,0.1)", color: "#4A4A4A" },
};

export default function Badge({ label, variant = "neutral" }: BadgeProps) {
  const v = variants[variant];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: v.color,
        background: v.bg,
        padding: "3px 10px",
        borderRadius: 20,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
