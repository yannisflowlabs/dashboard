"use client";

import { useState, useEffect } from "react";
import { Heart, MessageCircle, Users, TrendingUp, ExternalLink, Loader2, Camera, Play, Clock, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import Panel from "@/components/ui/Panel";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";

interface Post {
  id: string;
  type: string;
  shortCode: string;
  url: string;
  imageUrl: string;
  caption: string | null;
  likes: number;
  comments: number;
  timestamp: string;
}

interface Snapshot {
  date: string;
  followers: number;
}

interface BestTime {
  day?: number;
  hour?: number;
  label: string;
  avgEng: number;
}

interface InstagramData {
  username: string;
  fullName: string;
  biography: string;
  followers: number;
  following: number;
  postsCount: number;
  verified: boolean;
  profilePicUrl: string;
  externalUrl: string | null;
  recentPosts: Post[];
  snapshots: Snapshot[];
  bestTimes: { bestDays: BestTime[]; bestHours: BestTime[] };
  stats: {
    avgLikes: number;
    avgComments: number;
    engagementRate: number;
    totalPosts: number;
  };
  cachedAt?: string;
}

function proxyImg(url: string | null | undefined): string {
  if (!url) return "";
  return `/api/instagram/proxy?url=${encodeURIComponent(url)}`;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days}j`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)}sem`;
  return `Il y a ${Math.floor(days / 30)}mois`;
}

const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function PostCalendar({ posts }: { posts: Post[] }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const postsByDay: Record<string, Post[]> = {};
  for (const post of posts) {
    const d = new Date(post.timestamp);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate().toString();
      if (!postsByDay[key]) postsByDay[key] = [];
      postsByDay[key].push(post);
    }
  }

  const postsThisMonth = Object.values(postsByDay).flat().length;

  const firstDay = new Date(year, month, 1);
  // Monday-based: 0=Mon … 6=Sun
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const isNext = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth());
  // Pas de limite vers le passé — navigation libre

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      {/* Compteur + navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px", color: postsThisMonth > 0 ? "var(--sage)" : "var(--text-muted)", lineHeight: 1 }}>{postsThisMonth}</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>post{postsThisMonth !== 1 ? "s" : ""}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--text-muted)", display: "flex" }}>
            <ChevronLeft size={13} />
          </button>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", minWidth: 110, textAlign: "center" }}>{MONTHS_FR[month]} {year}</span>
          <button onClick={nextMonth} disabled={isNext} style={{ background: "none", border: "none", cursor: isNext ? "not-allowed" : "pointer", padding: 2, color: isNext ? "var(--border-color)" : "var(--text-muted)", display: "flex" }}>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 60px)", gap: 2, marginBottom: 3 }}>
        {DAYS_SHORT.map(d => (
          <div key={d} style={{ width: 28, textAlign: "center", fontSize: 8, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 60px)", gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} style={{ width: 60, height: 60 }} />;
          const dayPosts = postsByDay[day.toString()] ?? [];
          const hasPost = dayPosts.length > 0;
          const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
          return (
            <div key={day} title={hasPost ? dayPosts.map(p => p.caption?.slice(0, 40) ?? "Post").join("\n") : undefined}
              style={{
                width: 60, height: 60, borderRadius: 4,
                background: hasPost ? (dayPosts.length >= 2 ? "var(--sage)" : "rgba(168,197,160,0.5)") : isToday ? "rgba(0,0,0,0.06)" : "transparent",
                border: isToday ? "1.5px solid var(--text-primary)" : "1px solid transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: hasPost ? 800 : 400,
                color: hasPost ? (dayPosts.length >= 2 ? "#FFF" : "#2E5E28") : "var(--text-muted)",
                cursor: hasPost ? "pointer" : "default",
              }}>
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(168,197,160,0.5)" }} />
          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>1 post</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: "var(--sage)" }} />
          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>2+ posts</span>
        </div>
      </div>
    </div>
  );
}

function FollowersChart({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
        Les données s'accumulent chaque jour. Reviens demain pour voir la courbe.
      </div>
    );
  }

  const values = snapshots.map(s => s.followers);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const gain = values[values.length - 1] - values[0];
  const w = 100 / (snapshots.length - 1);

  // Growth % vs mois précédent (première valeur = début période)
  const growthPct = values[0] > 0 ? ((gain / values[0]) * 100).toFixed(1) : null;

  // Trouver la valeur de mi-période pour label axe Y
  const midVal = Math.round((min + max) / 2);

  const points = snapshots.map((s, i) => {
    const x = i * w;
    const y = 100 - ((s.followers - min) / range) * 75 - 12;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>30 derniers jours</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", marginTop: 2 }}>
            {formatNumber(values[values.length - 1])}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: gain >= 0 ? "#2E5E28" : "#7A3028" }}>
            {gain >= 0 ? "+" : ""}{formatNumber(gain)}
          </div>
          {growthPct && (
            <div style={{ fontSize: 11, color: gain >= 0 ? "#2E5E28" : "#7A3028", marginTop: 2 }}>
              {gain >= 0 ? "▲" : "▼"} {Math.abs(Number(growthPct))}% vs début période
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {/* Axe Y */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", paddingBottom: 18, width: 36 }}>
          <span style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "right" }}>{formatNumber(max)}</span>
          <span style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "right" }}>{formatNumber(midVal)}</span>
          <span style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "right" }}>{formatNumber(min)}</span>
        </div>

        <div style={{ flex: 1 }}>
          <svg viewBox="0 0 100 100" style={{ width: "100%", height: 130 }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="follGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A8C5A0" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#A8C5A0" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[12, 50, 88].map(y => (
              <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--border-color)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
            ))}
            <polygon points={`0,100 ${points} 100,100`} fill="url(#follGrad)" />
            <polyline points={points} fill="none" stroke="#A8C5A0" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            {snapshots.map((s, i) => (
              <circle key={i} cx={i * w} cy={100 - ((s.followers - min) / range) * 75 - 12}
                r="1.8" fill="#A8C5A0" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{snapshots[0].date.slice(5)}</span>
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{snapshots[snapshots.length - 1].date.slice(5)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BestTimesChart({ bestDays, bestHours }: { bestDays: BestTime[]; bestHours: BestTime[] }) {
  const maxDay = Math.max(...bestDays.map(d => d.avgEng), 1);
  const maxHour = Math.max(...bestHours.map(h => h.avgEng), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 8 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Par jour</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {bestDays.map((d) => (
            <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)", width: 78, flexShrink: 0 }}>{d.label}</span>
              <div style={{ flex: 1, height: 7, background: "var(--border-color)", borderRadius: 4 }}>
                <div style={{ width: `${(d.avgEng / maxDay) * 100}%`, height: "100%", background: d.avgEng === maxDay ? "var(--sage)" : "var(--lavender)", borderRadius: 4, transition: "width 0.5s ease" }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", width: 44, textAlign: "right" }}>{formatNumber(d.avgEng)}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Meilleure heure</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {bestHours.map((h) => (
            <div key={h.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)", width: 78, flexShrink: 0 }}>{h.label}</span>
              <div style={{ flex: 1, height: 7, background: "var(--border-color)", borderRadius: 4 }}>
                <div style={{ width: `${(h.avgEng / maxHour) * 100}%`, height: "100%", background: h.avgEng === maxHour ? "var(--yellow)" : "var(--lavender)", borderRadius: 4, transition: "width 0.5s ease" }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", width: 44, textAlign: "right" }}>{formatNumber(h.avgEng)}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-cream)", borderRadius: 8, padding: "8px 10px", lineHeight: 1.5 }}>
        Basé sur l'engagement moyen de tes derniers posts analysés.
      </div>
    </div>
  );
}

export default function InstagramPage() {
  const [data, setData] = useState<InstagramData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/instagram")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/instagram", { method: "POST" });
      const d = await res.json();
      if (d.error) setError(d.error);
      else setData(d);
    } catch {
      setError("Erreur lors de l'actualisation");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div style={{ padding: "28px", maxWidth: 1100 }}>
      <PageHeader
        title="Instagram"
        subtitle="@yannisflowlabs · Données via Apify"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleRefresh} disabled={refreshing}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", background: "#FFF", color: "var(--text-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-nav)", fontSize: 13, fontWeight: 600, cursor: refreshing ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              {refreshing ? "Scrape en cours (~45s)…" : data?.cachedAt ? `Mis à jour ${new Date(data.cachedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : "Actualiser"}
            </button>
            <a href="https://www.instagram.com/yannisflowlabs/" target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--text-primary)", color: "#FFF", borderRadius: "var(--radius-nav)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
              <ExternalLink size={13} /> Voir le profil
            </a>
          </div>
        }
      />

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)", fontSize: 13, padding: "60px 0" }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
          Chargement des données Instagram (peut prendre ~30s)…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ padding: "16px", background: "rgba(232,160,144,0.15)", borderRadius: 12, border: "1px solid rgba(232,160,144,0.4)", fontSize: 13, color: "#7A3028" }}>
          {error}
        </div>
      )}

      {data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "20px" }}>
            <KpiCard title="Abonnés" value={formatNumber(data.followers)} sub={`${data.following} abonnements`} accent="sage" icon={<Users size={15} />} />
            <KpiCard title="Taux d'engagement" value={`${data.stats.engagementRate}%`} sub="Likes + comments / abonnés" accent="yellow" icon={<TrendingUp size={15} />} />
            <KpiCard title="Moy. likes" value={formatNumber(data.stats.avgLikes)} sub={`${data.stats.avgComments} comments en moy.`} accent="lavender" icon={<Heart size={15} />} />
            <KpiCard title="Posts" value={`${data.postsCount}`} sub={`${data.stats.totalPosts} posts analysés`} accent="coral" icon={<Camera size={15} />} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Grille posts — 4 lignes × 3 colonnes = 12 posts */}
              <Panel title="Posts récents">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", paddingTop: 12 }}>
                  {data.recentPosts.slice(0, 12).map((post) => (
                    <a key={post.id} href={post.url} target="_blank" rel="noopener noreferrer"
                      style={{ textDecoration: "none", display: "block", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border-color)", position: "relative", aspectRatio: "1", background: "#F0EDE8" }}>
                      {post.imageUrl ? (
                        <img src={proxyImg(post.imageUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Camera size={24} style={{ color: "var(--text-muted)" }} />
                        </div>
                      )}
                      {post.type === "Video" && (
                        <div style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.5)", borderRadius: 6, padding: "2px 5px", display: "flex", alignItems: "center", gap: 3 }}>
                          <Play size={10} style={{ color: "#FFF" }} />
                        </div>
                      )}
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", opacity: 0, transition: "opacity 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                        onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#FFF", fontSize: 13, fontWeight: 700 }}><Heart size={14} /> {formatNumber(post.likes)}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#FFF", fontSize: 13, fontWeight: 700 }}><MessageCircle size={14} /> {formatNumber(post.comments)}</span>
                      </div>
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 8px", background: "rgba(0,0,0,0.4)" }}>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>{timeAgo(post.timestamp)}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </Panel>

              {/* Calendrier de publication */}
              <Panel title="Calendrier de publication">
                <div style={{ paddingTop: 12 }}>
                  <PostCalendar posts={data.recentPosts} />
                </div>
              </Panel>

              {/* Évolution abonnés */}
              <Panel title="Évolution des abonnés" action={<span style={{ fontSize: 11, color: "var(--text-muted)" }}>Snapshot quotidien</span>}>
                <div style={{ paddingTop: 8 }}>
                  <FollowersChart snapshots={data.snapshots} />
                </div>
              </Panel>
            </div>

            {/* Rail droit */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Panel title="Profil">
                <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={proxyImg(data.profilePicUrl)} alt={data.username} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border-color)" }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>
                        {data.fullName}
                        {data.verified && <span style={{ marginLeft: 5, fontSize: 11, color: "#1877F2" }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>@{data.username}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>{data.biography}</p>
                  {data.externalUrl && (
                    <a href={data.externalUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 12, color: "#3E3680", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                      <ExternalLink size={11} /> {data.externalUrl.replace("https://", "")}
                    </a>
                  )}
                </div>
              </Panel>

              <Panel title="Meilleur moment pour poster" action={<Clock size={13} style={{ color: "var(--text-muted)" }} />}>
                <BestTimesChart bestDays={data.bestTimes.bestDays} bestHours={data.bestTimes.bestHours} />
              </Panel>

              <Panel title="Top posts">
                <div style={{ paddingTop: 8, display: "flex", flexDirection: "column" }}>
                  {[...data.recentPosts]
                    .sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))
                    .slice(0, 5)
                    .map((post, i) => (
                      <a key={post.id} href={post.url} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 4 ? "1px solid var(--border-color)" : "none", textDecoration: "none" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", width: 14 }}>#{i + 1}</span>
                        {post.imageUrl && <img src={proxyImg(post.imageUrl)} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.caption ?? "Sans légende"}</div>
                          <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                            <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}><Heart size={10} /> {formatNumber(post.likes)}</span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}><MessageCircle size={10} /> {formatNumber(post.comments)}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
