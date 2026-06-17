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

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

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
      <aside className="flex w-60 flex-col bg-brand-darker text-white">
        <div className="flex items-center gap-2 px-5 py-5 text-lg font-semibold">
          <span>💬</span>
          <span>WA Dashboard</span>
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
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <h1 className="text-lg font-semibold">{current?.label || "Dashboard"}</h1>
          <ConnectionStatus />
        </header>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
