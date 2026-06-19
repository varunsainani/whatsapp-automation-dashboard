"use client";

import { useEffect, useState } from "react";
import { getStats } from "@/lib/api";
import { useUI } from "@/components/ui";

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent || "text-slate-900"}`}>
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-slate-400">{sub}</p> : null}
    </div>
  );
}

function MessagesChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-semibold">Messages — last 7 days</h3>
      <div className="flex h-48 items-end gap-3">
        {data.map((d) => (
          <div
            key={d.date}
            className="flex h-full flex-1 flex-col items-center gap-2"
          >
            <span className="text-xs font-medium text-slate-500">{d.count}</span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-md bg-brand transition-all"
                style={{ height: `${Math.round((d.count / max) * 100)}%` }}
                title={`${d.date}: ${d.count}`}
              />
            </div>
            <span className="text-xs text-slate-400">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { toast } = useUI();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((err) => toast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) {
    return <div className="p-8 text-sm text-slate-400">Loading dashboard…</div>;
  }
  if (!stats) {
    return <div className="p-8 text-sm text-slate-400">No data available.</div>;
  }

  const convTotal = stats.totals.conversations;
  const msgTotal = stats.messages.inbound + stats.messages.outbound;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total leads" value={stats.totals.contacts} />
        <StatCard
          label="Active chats"
          value={stats.conversations.active}
          accent="text-brand-dark"
        />
        <StatCard label="Total messages" value={stats.totals.messages} />
        <StatCard
          label="Completion rate"
          value={`${stats.conversations.completionRate}%`}
          sub={`${stats.conversations.completed} of ${convTotal} completed`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MessagesChart data={stats.messagesPerDay} />
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold">Conversations</h3>
            <div className="space-y-3">
              <Bar
                label="Active"
                value={stats.conversations.active}
                total={convTotal}
                color="bg-brand"
              />
              <Bar
                label="Closed"
                value={stats.conversations.closed}
                total={convTotal}
                color="bg-slate-400"
              />
              <Bar
                label="Completed"
                value={stats.conversations.completed}
                total={convTotal}
                color="bg-amber-400"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold">Message direction</h3>
            <div className="space-y-3">
              <Bar
                label="Inbound"
                value={stats.messages.inbound}
                total={msgTotal}
                color="bg-sky-400"
              />
              <Bar
                label="Outbound"
                value={stats.messages.outbound}
                total={msgTotal}
                color="bg-brand"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
