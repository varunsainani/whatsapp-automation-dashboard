"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getToken, logout } from "@/lib/api";

const NAV = [
  { href: "/conversations", label: "Conversations", icon: "💬" },
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

  return (
    <div className="flex min-h-screen">
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

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
