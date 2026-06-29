"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, X as XIcon, Clock, ChevronRight } from "lucide-react";

interface PendingCall {
  id: number;
  uid: string;
  attendee: { name: string; email: string } | null;
  start: string;
  dateLabel: string;
  timeLabel: string;
  duration: number;
  calStatus: string;
}

type ReviewStatus = "showed" | "noshow" | "cancelled";

const statusOptions: { status: ReviewStatus; label: string; icon: React.ReactNode; bg: string; color: string }[] = [
  { status: "showed", label: "Présent(e)", icon: <CheckCircle size={13} />, bg: "var(--sage)", color: "#1C1C1E" },
  { status: "noshow", label: "No-show", icon: <XCircle size={13} />, bg: "#FFF", color: "var(--text-secondary)" },
  { status: "cancelled", label: "Annulé", icon: <XIcon size={13} />, bg: "#FFF", color: "var(--text-secondary)" },
];

export default function CallReviewBanner() {
  const [pending, setPending] = useState<PendingCall[]>([]);
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState<ReviewStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/calcom");
      const data = await res.json();
      if (data.pendingReview?.length > 0) {
        setPending(data.pendingReview);
        setCurrent(0);
        setDismissed(false);
      }
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  const submitReview = async (status: ReviewStatus) => {
    const call = pending[current];
    if (!call) return;
    setSubmitting(status);
    try {
      await fetch("/api/call-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: call.id,
          bookingUid: call.uid,
          attendeeName: call.attendee?.name ?? "Inconnu",
          attendeeEmail: call.attendee?.email ?? "",
          startTime: call.start,
          status,
          calStatus: call.calStatus,
        }),
      });
      const remaining = pending.filter((_, i) => i !== current);
      setPending(remaining);
      setCurrent(0);
    } catch {
      // silently ignore
    } finally {
      setSubmitting(null);
    }
  };

  const call = pending[current];
  if (!call || dismissed) return null;

  return (
    <div
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 100,
        width: 380, background: "#FFFFFF",
        borderRadius: "var(--radius-card)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.06)",
        border: "1px solid var(--border-color)", overflow: "hidden",
        animation: "slideUp 0.25s ease",
      }}
    >
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Header */}
      <div style={{ padding: "12px 18px", background: "var(--yellow-light)", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Clock size={13} style={{ color: "#7A5E10" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#7A5E10" }}>Call terminé · à confirmer</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {pending.length > 1 && (
            <span style={{ fontSize: 11, color: "#7A5E10", fontWeight: 600 }}>{current + 1} / {pending.length}</span>
          )}
          <button onClick={() => setDismissed(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#7A5E10", display: "flex", padding: 0 }}>
            <XIcon size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "18px" }}>
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
            {call.attendee?.name ?? "Invité inconnu"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {call.dateLabel} · {call.timeLabel} · {call.duration} min
          </div>
          {call.attendee?.email && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{call.attendee.email}</div>
          )}
        </div>

        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: "14px", lineHeight: 1.5 }}>
          Que s'est-il passé lors de ce call ?
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {statusOptions.map((opt) => (
            <button
              key={opt.status}
              onClick={() => submitReview(opt.status)}
              disabled={submitting !== null}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                padding: "10px 8px", borderRadius: "var(--radius-nav)",
                border: "1px solid var(--border-color)",
                background: submitting === opt.status ? "var(--sage)" : opt.bg,
                color: submitting === opt.status ? "#1C1C1E" : opt.color,
                cursor: submitting !== null ? "not-allowed" : "pointer",
                fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                opacity: submitting !== null && submitting !== opt.status ? 0.5 : 1,
                transition: "all 0.1s",
              }}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>

        {pending.length > 1 && (
          <button
            onClick={() => setCurrent((c) => (c + 1) % pending.length)}
            style={{ width: "100%", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "6px", background: "transparent", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text-muted)", fontFamily: "inherit" }}
          >
            Passer au suivant <ChevronRight size={11} />
          </button>
        )}
      </div>
    </div>
  );
}
