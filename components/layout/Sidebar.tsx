"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Calendar,
  Camera,
  Filter,
  Settings,
  LogOut,
  UserCheck,
} from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/finances", icon: TrendingUp, label: "Finances" },
  { href: "/crm", icon: Users, label: "CRM Pipeline" },
  { href: "/clients", icon: UserCheck, label: "Suivi clients" },
  { href: "/calendrier", icon: Calendar, label: "Calendrier" },
  { href: "/instagram", icon: Camera, label: "Instagram" },
  { href: "/tunnel", icon: Filter, label: "Tunnel de conversion" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: "var(--sidebar-width)",
        minWidth: "var(--sidebar-width)",
        background: "var(--sidebar-bg)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "20px 12px",
        gap: "4px",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "4px 12px 20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "var(--sage)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
            color: "#1C1C1E",
            flexShrink: 0,
          }}
        >
          Y
        </div>
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-on-dark)",
            letterSpacing: "-0.3px",
          }}
        >
          Yannis.ai
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 12px",
                borderRadius: "var(--radius-nav)",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--text-on-dark)" : "var(--text-on-dark-secondary)",
                background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                transition: "all 0.15s ease",
              }}
            >
              <Icon
                size={16}
                style={{ opacity: isActive ? 1 : 0.6 }}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <div
          style={{
            height: 1,
            background: "var(--border-dark)",
            margin: "8px 12px",
          }}
        />
        <Link
          href="/reglages"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "9px 12px",
            borderRadius: "var(--radius-nav)",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: pathname === "/reglages" ? 600 : 500,
            color: pathname === "/reglages" ? "var(--text-on-dark)" : "var(--text-on-dark-secondary)",
            background: pathname === "/reglages" ? "rgba(255,255,255,0.1)" : "transparent",
          }}
        >
          <Settings size={16} strokeWidth={1.8} style={{ opacity: 0.6 }} />
          Réglages
        </Link>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "9px 12px",
            borderRadius: "var(--radius-nav)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-on-dark-muted)",
            width: "100%",
          }}
        >
          <LogOut size={16} strokeWidth={1.8} style={{ opacity: 0.6 }} />
          Déconnexion
        </button>

        {/* User avatar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 12px 4px",
            marginTop: "4px",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--lavender), var(--sage))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "#1C1C1E",
              flexShrink: 0,
            }}
          >
            YA
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-on-dark)" }}>
              Yannis Ashay
            </div>
            <div style={{ fontSize: 11, color: "var(--text-on-dark-muted)" }}>
              Admin
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
