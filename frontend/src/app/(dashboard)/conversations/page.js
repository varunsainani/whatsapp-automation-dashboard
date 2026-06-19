"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getConversations,
  getConversation,
  updateConversation,
  sendReply,
  getQuickReplies
} from "@/lib/api";
import { useUI } from "@/components/ui";

const PAGE_SIZE = 15;
// How often the list + open conversation refresh themselves. The hosted demo
// runs on serverless (no WebSocket), so near-real-time updates come from
// short-interval polling instead of Socket.IO pushes.
const POLL_MS = 4000;

function timeLabel(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function StatusBadge({ status }) {
  const active = status === "active";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

export default function ConversationsPage() {
  const { toast } = useUI();

  const [conversations, setConversations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loadingList, setLoadingList] = useState(true);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const filtersRef = useRef({ q: "", status: "", page: 1 });

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const selectedIdRef = useRef(null);

  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const [qrOpen, setQrOpen] = useState(false);

  const logEndRef = useRef(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    filtersRef.current = { q, status: statusFilter, page };
  }, [q, statusFilter, page]);

  // silent=true is used by the poll loop so periodic refreshes don't flash the
  // "Loading…" placeholder or surface transient network errors as toasts.
  const loadList = useCallback(
    async (silent = false) => {
      const f = filtersRef.current;
      if (!silent) setLoadingList(true);
      try {
        const res = await getConversations({
          q: f.q,
          status: f.status,
          page: f.page,
          limit: PAGE_SIZE
        });
        setConversations(res.data);
        setPagination(res.pagination);
      } catch (err) {
        if (!silent) toast(err.message, "error");
      } finally {
        if (!silent) setLoadingList(false);
      }
    },
    [toast]
  );

  // Silently re-fetch the currently open conversation so new inbound/outbound
  // messages appear without a manual refresh. Guards against races where the
  // user switches conversations mid-request.
  const refreshDetail = useCallback(async () => {
    const id = selectedIdRef.current;
    if (!id) return;
    try {
      const fresh = await getConversation(id);
      if (selectedIdRef.current === fresh.id) setDetail(fresh);
    } catch {
      /* ignore transient errors during polling */
    }
  }, []);

  // Debounced list reload on filter/page changes.
  useEffect(() => {
    const t = setTimeout(() => loadList(), 250);
    return () => clearTimeout(t);
  }, [q, statusFilter, page, loadList]);

  // Quick replies (loaded once).
  useEffect(() => {
    getQuickReplies()
      .then(setQuickReplies)
      .catch(() => setQuickReplies([]));
  }, []);

  // Poll the list and the open conversation so new messages / status changes
  // surface within a few seconds (the serverless backend has no WebSocket push).
  useEffect(() => {
    const interval = setInterval(() => {
      loadList(true);
      refreshDetail();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [loadList, refreshDetail]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages?.length]);

  async function openConversation(id) {
    setSelectedId(id);
    setLoadingDetail(true);
    setReplyText("");
    setQrOpen(false);
    try {
      setDetail(await getConversation(id));
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function toggleStatus() {
    if (!detail) return;
    const next = detail.status === "active" ? "closed" : "active";
    try {
      await updateConversation(detail.id, { status: next });
      setDetail((prev) => (prev ? { ...prev, status: next } : prev));
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function toggleBot() {
    if (!detail) return;
    const next = !detail.bot_enabled;
    try {
      await updateConversation(detail.id, { bot_enabled: next });
      setDetail((prev) => (prev ? { ...prev, bot_enabled: next } : prev));
      toast(
        next ? "Bot re-enabled" : "Bot paused — you're handling this chat",
        "success"
      );
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function send() {
    const text = replyText.trim();
    if (!text || !detail) return;
    setSending(true);
    try {
      const res = await sendReply(detail.id, text);
      setReplyText("");
      // Append immediately — there's no socket echo on the serverless backend;
      // the poll loop reconciles the list/detail a moment later.
      if (res.message) {
        setDetail((prev) =>
          prev &&
          prev.id === detail.id &&
          !prev.messages.some((m) => m.id === res.message.id)
            ? { ...prev, messages: [...prev.messages, res.message] }
            : prev
        );
      }
      loadList(true);
      if (res.delivered === false) {
        toast("Saved — WhatsApp offline, not delivered", "info");
      }
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSending(false);
    }
  }

  function pickQuickReply(reply) {
    setReplyText((prev) => (prev ? `${prev} ${reply.response_text}` : reply.response_text));
    setQrOpen(false);
  }

  const collectedEntries = detail ? Object.entries(detail.collected || {}) : [];

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="flex w-80 flex-col border-r border-slate-200 bg-white">
        <div className="space-y-2 border-b border-slate-200 p-3">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or phone…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <div className="flex gap-1">
            {["", "active", "closed"].map((s) => (
              <button
                key={s || "all"}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`flex-1 rounded-lg px-2 py-1 text-xs font-medium capitalize transition ${
                  statusFilter === s
                    ? "bg-brand text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s || "all"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <p className="p-4 text-sm text-slate-400">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No conversations found.</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => openConversation(c.id)}
                className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                  selectedId === c.id ? "bg-slate-100" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {c.contact?.name || c.contact?.phone_number || "Unknown"}
                  </span>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {c.last_message
                    ? `${c.last_message.direction === "outbound" ? "↩ " : ""}${
                        c.last_message.body
                      }`
                    : "No messages"}
                </p>
                <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  {c.contact?.phone_number} · {c.message_count} msg
                  {c.bot_enabled === false ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      agent
                    </span>
                  ) : null}
                </p>
              </button>
            ))
          )}
        </div>

        {pagination.pages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded px-2 py-1 text-slate-600 disabled:opacity-40 enabled:hover:bg-slate-100"
            >
              ← Prev
            </button>
            <span className="text-xs text-slate-400">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages}
              className="rounded px-2 py-1 text-slate-600 disabled:opacity-40 enabled:hover:bg-slate-100"
            >
              Next →
            </button>
          </div>
        ) : null}
      </div>

      {/* Detail */}
      <div className="flex flex-1 flex-col bg-slate-50">
        {!detail ? (
          <div className="flex flex-1 items-center justify-center text-slate-400">
            Select a conversation to view the log
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
              <div>
                <h3 className="font-semibold">
                  {detail.contact?.name || detail.contact?.phone_number || "Unknown"}
                </h3>
                <p className="text-xs text-slate-500">
                  {detail.contact?.phone_number} · step: {detail.current_step ?? "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={detail.status} />
                <button
                  onClick={toggleBot}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    detail.bot_enabled
                      ? "bg-brand/10 text-brand-dark hover:bg-brand/20"
                      : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  }`}
                >
                  {detail.bot_enabled ? "🤖 Bot on" : "✋ Agent mode"}
                </button>
                <button
                  onClick={toggleStatus}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium transition hover:bg-slate-100"
                >
                  {detail.status === "active" ? "Close" : "Reopen"}
                </button>
              </div>
            </div>

            {collectedEntries.length > 0 ? (
              <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-white px-6 py-3">
                {collectedEntries.map(([key, value]) => (
                  <span
                    key={key}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                  >
                    <span className="font-semibold">{key}:</span> {String(value)}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
              {loadingDetail ? (
                <p className="text-sm text-slate-400">Loading messages…</p>
              ) : (
                detail.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.direction === "outbound" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-md rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        m.direction === "outbound"
                          ? "bg-brand text-white"
                          : "bg-white text-slate-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p
                        className={`mt-1 text-right text-[10px] ${
                          m.direction === "outbound" ? "text-white/70" : "text-slate-400"
                        }`}
                      >
                        {timeLabel(m.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>

            {/* Composer */}
            <div className="relative border-t border-slate-200 bg-white px-4 py-3">
              {detail.bot_enabled ? (
                <p className="mb-2 text-xs text-slate-400">
                  Bot is active. Sending a reply does not pause it — switch to
                  Agent mode to take over.
                </p>
              ) : null}

              {qrOpen && quickReplies.length > 0 ? (
                <div className="absolute bottom-full left-4 mb-2 max-h-60 w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  {quickReplies.map((qr) => (
                    <button
                      key={qr.id}
                      onClick={() => pickQuickReply(qr)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                    >
                      <span className="font-medium text-brand-dark">{qr.label}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {qr.response_text}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="flex items-end gap-2">
                <button
                  onClick={() => setQrOpen((o) => !o)}
                  disabled={quickReplies.length === 0}
                  title="Quick replies"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm transition hover:bg-slate-100 disabled:opacity-40"
                >
                  ⚡
                </button>
                <textarea
                  rows={1}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Type a reply… (Enter to send, Shift+Enter for newline)"
                  className="max-h-32 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <button
                  onClick={send}
                  disabled={sending || !replyText.trim()}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
                >
                  {sending ? "…" : "Send"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
