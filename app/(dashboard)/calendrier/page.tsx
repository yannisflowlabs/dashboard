"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, Video, ExternalLink, Loader2, CheckCircle, XCircle, X as XIcon } from "lucide-react";
import Panel from "@/components/ui/Panel";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import Badge from "@/components/ui/Badge";

type ReviewStatus = "showed" | "noshow" | "cancelled";

interface Booking {
  id: number;
  uid: string;
  calStatus: string;
  start: string;
  duration: number;
  meetingUrl: string | null;
  cancellationReason: string | null;
  attendee: { name: string; email: string } | null;
  dateLabel: string;
  timeLabel: string;
  isToday: boolean;
}

interface ReviewStats {
  total: number;
  showed: number;
  noshow: number;
  cancelled: number;
  relevantTotal: number;
  showRate: number | null;
}

interface CalData {
  upcoming: Booking[];
  allPast: Booking[];
  pendingReview: Booking[];
  reviewMap: Record<number, ReviewStatus>;
  stats: { thisWeek: number; thisMonth: number; total: number };
}

interface ReviewData {
  stats: ReviewStats;
}

const statusConfig: Record<ReviewStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  showed: { label: "Présent", icon: <CheckCircle size={12} />, color: "#2E5E28", bg: "rgba(168,197,160,0.15)" },
  noshow: { label: "No-show", icon: <XCircle size={12} />, color: "#7A3028", bg: "rgba(232,160,144,0.15)" },
  cancelled: { label: "Annulé", icon: <XIcon size={12} />, color: "#7A5E10", bg: "rgba(240,200,96,0.15)" },
};

const calStatusBadge: Record<string, { label: string; variant: "sage" | "yellow" | "lavender" | "coral" | "neutral" }> = {
  accepted: { label: "Accepté", variant: "sage" },
  cancelled: { label: "Annulé", variant: "yellow" },
  rejected: { label: "Refusé", variant: "lavender" },
};

function StatusSelector({ bookingId, bookingUid, attendee, start, calStatus, currentStatus, onUpdate }: {
  bookingId: number; bookingUid: string;
  attendee: { name: string; email: string } | null;
  start: string; calStatus: string;
  currentStatus: ReviewStatus | null;
  onUpdate: (id: number, status: ReviewStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async (status: ReviewStatus) => {
    setSaving(true);
    setOpen(false);
    try {
      await fetch("/api/call-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId, bookingUid,
          attendeeName: attendee?.name ?? "Inconnu",
          attendeeEmail: attendee?.email ?? "",
          startTime: start, status, calStatus,
        }),
      });
      onUpdate(bookingId, status);
    } finally {
      setSaving(false);
    }
  };

  const options: ReviewStatus[] = ["showed", "noshow", "cancelled"];

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        disabled={saving}
        style={{
          display: "flex", alignItems: "center", gap: "5px",
          padding: "5px 10px", borderRadius: 20,
          border: currentStatus ? "none" : "1px dashed var(--border-color)",
          background: currentStatus ? statusConfig[currentStatus].bg : "transparent",
          color: currentStatus ? statusConfig[currentStatus].color : "var(--text-muted)",
          cursor: saving ? "not-allowed" : "pointer",
          fontSize: 12, fontWeight: 600, fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
      >
        {saving ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> :
          currentStatus ? statusConfig[currentStatus].icon : null}
        {saving ? "…" : currentStatus ? statusConfig[currentStatus].label : "À confirmer"}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 50,
            background: "#FFF", borderRadius: "var(--radius-row)",
            border: "1px solid var(--border-color)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            overflow: "hidden", minWidth: 160,
          }}>
            {options.map((s) => (
              <button
                key={s}
                onClick={() => save(s)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "10px 14px", width: "100%",
                  background: currentStatus === s ? statusConfig[s].bg : "transparent",
                  border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  color: statusConfig[s].color, textAlign: "left",
                }}
              >
                {statusConfig[s].icon} {statusConfig[s].label}
              </button>
            ))}
          </div>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

type HistoryFilter = "all" | "accepted" | "cancelled" | "rejected";

export default function CalendrierPage() {
  const [calData, setCalData] = useState<CalData | null>(null);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviewMap, setReviewMap] = useState<Record<number, ReviewStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");

  const loadData = useCallback(async () => {
    try {
      const [cal, rev] = await Promise.all([
        fetch("/api/calcom").then((r) => r.json()),
        fetch("/api/call-reviews").then((r) => r.json()),
      ]);
      if (cal.error) setError(cal.error);
      else {
        setCalData(cal);
        setReviewMap(cal.reviewMap ?? {});
      }
      setReviewStats(rev.stats);
    } catch {
      setError("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleReviewUpdate = (bookingId: number, status: ReviewStatus) => {
    setReviewMap((prev) => ({ ...prev, [bookingId]: status }));
    // Refresh stats
    fetch("/api/call-reviews").then(r => r.json()).then(d => setReviewStats(d.stats));
  };

  const nextBooking = calData?.upcoming[0] ?? null;

  const filteredHistory = calData?.allPast.filter((b) => {
    if (historyFilter === "all") return true;
    return b.calStatus === historyFilter;
  }) ?? [];

  const filters: { key: HistoryFilter; label: string; count: number }[] = [
    { key: "all", label: "Tous", count: calData?.allPast.length ?? 0 },
    { key: "accepted", label: "Acceptés", count: calData?.allPast.filter(b => b.calStatus === "accepted").length ?? 0 },
    { key: "cancelled", label: "Annulés", count: calData?.allPast.filter(b => b.calStatus === "cancelled").length ?? 0 },
    { key: "rejected", label: "Refusés", count: calData?.allPast.filter(b => b.calStatus === "rejected").length ?? 0 },
  ];

  return (
    <div style={{ padding: "28px 28px", maxWidth: 1100 }}>
      <PageHeader
        title="Calendrier"
        subtitle="Cal.com · Bookings en temps réel"
        action={
          <a href="https://cal.com" target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--text-primary)", color: "#FFF", borderRadius: "var(--radius-nav)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            <ExternalLink size={13} /> Ouvrir Cal.com
          </a>
        }
      />

      {error && <div style={{ padding: "12px 16px", background: "var(--coral-light)", borderRadius: "var(--radius-row)", marginBottom: 20, fontSize: 13, color: "#7A3028" }}>{error}</div>}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "60px 0", color: "var(--text-muted)", fontSize: 13 }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
          Chargement...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "20px" }}>
            <KpiCard
              title="Prochain RDV"
              value={nextBooking ? (nextBooking.isToday ? "Aujourd'hui" : nextBooking.dateLabel.split(" ").slice(0, 2).join(" ")) : "—"}
              sub={nextBooking ? nextBooking.timeLabel : "Aucun booking"}
              accent="sage" icon={<Calendar size={15} />}
            />
            <KpiCard
              title="Taux de présence"
              value={reviewStats?.showRate !== null && reviewStats?.showRate !== undefined ? `${reviewStats.showRate}%` : "—"}
              sub={`${reviewStats?.showed ?? 0} présents · ${reviewStats?.noshow ?? 0} no-shows`}
              accent="yellow"
            />
            <KpiCard
              title="Annulés"
              value={`${reviewStats?.cancelled ?? 0}`}
              sub="Non qualifiés ou logistique"
              accent="lavender"
            />
            <KpiCard
              title="À venir"
              value={`${calData?.stats.total ?? 0}`}
              sub="Bookings Cal.com"
              accent="coral" icon={<Calendar size={15} />}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Upcoming */}
              {(calData?.upcoming.length ?? 0) > 0 && (
                <Panel title="À venir">
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: 8 }}>
                    {calData?.upcoming.map((b) => (
                      <div key={b.id} style={{ display: "flex", gap: "14px", padding: "16px", borderRadius: "var(--radius-row)", border: "1px solid", borderColor: b.isToday ? "var(--sage)" : "var(--border-color)", background: b.isToday ? "var(--sage-light)" : "#FFF" }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: b.isToday ? "var(--sage)" : "#F0EDE8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Calendar size={18} style={{ color: b.isToday ? "#1C1C1E" : "var(--text-muted)" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{b.attendee?.name ?? "Invité"}</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: 12, color: "var(--text-secondary)" }}>
                              <Clock size={11} /> {b.isToday ? "Aujourd'hui" : b.dateLabel} · {b.timeLabel}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: 12, color: "var(--text-secondary)" }}>
                              <Video size={11} /> {b.duration} min
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
                          <Badge label="Cal.com" variant="lavender" />
                          {b.meetingUrl && (
                            <a href={b.meetingUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "3px", textDecoration: "none" }}>
                              <ExternalLink size={10} /> Rejoindre
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              {/* Historique complet */}
              <Panel title="Historique complet"
                action={
                  <div style={{ display: "flex", gap: "4px" }}>
                    {filters.map((f) => (
                      <button key={f.key} onClick={() => setHistoryFilter(f.key)}
                        style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600, borderRadius: 20, border: "1px solid var(--border-color)", background: historyFilter === f.key ? "var(--text-primary)" : "#FFF", color: historyFilter === f.key ? "#FFF" : "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
                        {f.label} {f.count > 0 ? `(${f.count})` : ""}
                      </button>
                    ))}
                  </div>
                }
              >
                <div style={{ display: "flex", flexDirection: "column", paddingTop: 8 }}>
                  {filteredHistory.length === 0 ? (
                    <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: "20px 0" }}>Aucun call dans cette catégorie</div>
                  ) : (
                    filteredHistory.map((b, i) => {
                      const currentStatus = (reviewMap[b.id] as ReviewStatus) ?? null;
                      const badge = calStatusBadge[b.calStatus] ?? { label: b.calStatus, variant: "neutral" as const };
                      return (
                        <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: i < filteredHistory.length - 1 ? "1px solid var(--border-color)" : "none" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                              {b.attendee?.name ?? "Invité"}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: 2 }}>
                              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{b.dateLabel} · {b.timeLabel}</span>
                              {b.cancellationReason && (
                                <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>"{b.cancellationReason}"</span>
                              )}
                            </div>
                          </div>
                          <Badge label={badge.label} variant={badge.variant} />
                          <StatusSelector
                            bookingId={b.id}
                            bookingUid={b.uid}
                            attendee={b.attendee}
                            start={b.start}
                            calStatus={b.calStatus}
                            currentStatus={currentStatus}
                            onUpdate={handleReviewUpdate}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </Panel>
            </div>

            {/* Right rail */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {nextBooking && (
                <Panel title="Prochain RDV">
                  <div style={{ paddingTop: 8, display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ padding: "14px", background: "var(--sage-light)", borderRadius: "var(--radius-row)" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{nextBooking.attendee?.name ?? "Invité"}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{nextBooking.attendee?.email}</div>
                    </div>
                    {[
                      { label: "Date", value: nextBooking.isToday ? "Aujourd'hui" : nextBooking.dateLabel },
                      { label: "Heure", value: nextBooking.timeLabel },
                      { label: "Durée", value: `${nextBooking.duration} min` },
                    ].map((r) => (
                      <div key={r.label} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{r.value}</span>
                      </div>
                    ))}
                    {nextBooking.meetingUrl && (
                      <a href={nextBooking.meetingUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", background: "var(--text-primary)", color: "#FFF", borderRadius: "var(--radius-nav)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                        <Video size={13} /> Rejoindre le call
                      </a>
                    )}
                  </div>
                </Panel>
              )}

              {/* Stats présence */}
              <Panel title="Taux de présence">
                <div style={{ paddingTop: 8, display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.5px" }}>
                      {reviewStats?.showRate !== null && reviewStats?.showRate !== undefined ? `${reviewStats.showRate}%` : "—"}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>sur {reviewStats?.relevantTotal ?? 0} calls</span>
                  </div>
                  <div style={{ height: 8, background: "var(--border-color)", borderRadius: 4 }}>
                    <div style={{ width: `${reviewStats?.showRate ?? 0}%`, height: "100%", background: (reviewStats?.showRate ?? 0) >= 70 ? "var(--sage)" : "var(--yellow)", borderRadius: 4, transition: "width 0.5s ease" }} />
                  </div>

                  {[
                    { label: "Présents", value: reviewStats?.showed ?? 0, color: "#2E5E28", icon: <CheckCircle size={11} /> },
                    { label: "No-shows", value: reviewStats?.noshow ?? 0, color: "#7A3028", icon: <XCircle size={11} /> },
                    { label: "Annulés", value: reviewStats?.cancelled ?? 0, color: "#7A5E10", icon: <XIcon size={11} /> },
                  ].map((s) => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: s.color, fontSize: 12 }}>
                        {s.icon} {s.label}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
                    </div>
                  ))}

                  <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "8px 10px", background: "var(--bg-cream)", borderRadius: "var(--radius-sm)", lineHeight: 1.5 }}>
                    Le taux de présence exclut les calls refusés et annulés.
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
