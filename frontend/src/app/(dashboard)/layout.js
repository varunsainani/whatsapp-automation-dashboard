"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getToken, logout } from "@/lib/api";
import ConnectionStatus from "@/components/ConnectionStatus";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/conversations", label: "Conversations", icon: "💬" },
  { href: "/leads", label: "Leads", icon: "👥" },
  { href: "/templates", label: "Templates", icon: "📝" },
  { href: "/quick-replies", label: "Quick Replies", icon: "⚡" },
  { href: "/flows", label: "Flows", icon: "🔀" }
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  const current = NAV.find((item) => pathname?.startsWith(item.href));

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile drawer backdrop */}
      {navOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Sidebar: static on desktop, slide-in drawer on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 transform flex-col bg-brand-darker text-white transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span>💬</span>
            <span>WA Dashboard</span>
          </div>
          <button
            onClick={() => setNavOpen(false)}
            className="rounded-lg p-1 text-white/70 hover:bg-white/10 lg:hidden"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="m-3 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/20"
        >
          Log out
        </button>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            onClick={() => setNavOpen(true)}
            className="-ml-1 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 className="flex-1 truncate text-base font-semibold sm:text-lg">
            {current?.label || "Dashboard"}
          </h1>
          <ConnectionStatus />
        </header>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
