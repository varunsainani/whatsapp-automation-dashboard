"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login, getToken } from "@/lib/api";

// Public demo credentials are injected at build time (NEXT_PUBLIC_DEMO_*), so no
// password is ever committed to the repo. When unset, the one-click demo button
// is hidden and the page works as a normal login. This is a dedicated throwaway
// demo account — separate from the real admin login.
const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL || "";
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "";
const DEMO_ENABLED = Boolean(DEMO_EMAIL && DEMO_PASSWORD);

const FEATURES = [
  {
    icon: "🤖",
    title: "Automated conversation flow",
    desc: "A configurable bot greets contacts and collects their details step by step."
  },
  {
    icon: "✋",
    title: "Human handoff & live reply",
    desc: "Pause the bot on any chat and take over as a human agent in real time."
  },
  {
    icon: "📊",
    title: "Live analytics",
    desc: "Leads, active chats, completion rate and a 7-day message volume chart."
  },
  {
    icon: "👥",
    title: "Leads / CRM with CSV export",
    desc: "Every contact with their captured data, searchable, one click to export."
  }
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  async function doLogin(em, pw) {
    setError("");
    await login(em, pw);
    router.replace("/dashboard");
  }

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await doLogin(email, password);
    } catch (err) {
      setError(err.message || "Login failed");
      setLoading(false);
    }
  }

  async function enterDemo() {
    setDemoLoading(true);
    try {
      await doLogin(DEMO_EMAIL, DEMO_PASSWORD);
    } catch (err) {
      setError(err.message || "Demo login failed");
      setDemoLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left: product showcase */}
      <div className="flex flex-1 flex-col justify-center bg-gradient-to-br from-brand-darker via-brand-dark to-brand px-8 py-12 text-white lg:px-14">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur">
              💬
            </div>
            <span className="text-lg font-semibold">WhatsApp Automation Dashboard</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Turn WhatsApp into an automated lead machine.
          </h1>
          <p className="mt-4 text-white/80">
            A bot handles incoming conversations, captures leads through a custom
            flow, and lets your team take over live — all from one admin panel.
            No code, no paid WhatsApp API.
          </p>
          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="mt-0.5 text-xl">{f.icon}</span>
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-white/70">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right: one-click demo + sign in */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl bg-white p-8 shadow-lg">
            <div className="mb-6 text-center">
              <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand-dark">
                Live demo
              </span>
              <h2 className="mt-3 text-xl font-semibold">Explore the dashboard</h2>
              <p className="mt-1 text-sm text-slate-500">
                Jump straight in with sample data — no signup needed.
              </p>
            </div>

            {DEMO_ENABLED ? (
              <>
                <button
                  onClick={enterDemo}
                  disabled={demoLoading || loading}
                  className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {demoLoading ? "Entering…" : "🔓 Enter live demo"}
                </button>

                <div className="relative my-5 text-center">
                  <span className="absolute left-0 top-1/2 h-px w-full bg-slate-200" />
                  <span className="relative bg-white px-3 text-xs uppercase tracking-wide text-slate-400">
                    or sign in
                  </span>
                </div>
              </>
            ) : null}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="••••••••"
                />
              </div>

              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading || demoLoading}
                className="w-full rounded-lg border border-brand py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand/5 disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>

          {DEMO_ENABLED ? (
            <p className="mt-4 text-center text-xs text-slate-400">
              Demo credentials are pre-filled — just click{" "}
              <span className="font-medium text-slate-500">Enter live demo</span>.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
