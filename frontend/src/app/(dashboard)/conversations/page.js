"use client";

import { useEffect, useRef, useState } from "react";
import {
  getConversations,
  getConversation,
  updateConversationStatus
} from "@/lib/api";
import { getSocket } from "@/lib/socket";

function timeLabel(value) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleString([], {
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
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const selectedIdRef = useRef(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  async function loadList() {
    try {
      setConversations(await getConversations());
    } finally {
      setLoadingList(false);
    }
  }

  async function openConversation(id) {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      setDetail(await getConversation(id));
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    loadList();

    const socket = getSocket();
    if (!socket) return undefined;

    const onNew = () => loadList();

    const onMessage = (msg) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.conversation_id);
        if (idx === -1) {
          loadList();
          return prev;
        }
        const updated = {
          ...prev[idx],
          last_message: {
            direction: msg.direction,
            body: msg.body,
            timestamp: msg.timestamp
          },
          message_count: (prev[idx].message_count || 0) + 1
        };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      });

      if (msg.conversation_id === selectedIdRef.current) {
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                messages: [
                  ...prev.messages,
                  {
                    id: msg.id,
                    direction: msg.direction,
                    body: msg.body,
                    timestamp: msg.timestamp
                  }
                ]
              }
            : prev
        );
      }
    };

    const onUpdate = (u) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === u.id
            ? { ...c, status: u.status, collected: u.collected ?? c.collected }
            : c
        )
      );
      if (u.id === selectedIdRef.current) {
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                status: u.status,
                collected: u.collected ?? prev.collected,
                current_step: u.current_step ?? prev.current_step
              }
            : prev
        );
      }
    };

    socket.on("conversation:new", onNew);
    socket.on("message:new", onMessage);
    socket.on("conversation:update", onUpdate);

    return () => {
      socket.off("conversation:new", onNew);
      socket.off("message:new", onMessage);
      socket.off("conversation:update", onUpdate);
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages?.length]);

  async function toggleStatus() {
    if (!detail) return;
    const next = detail.status === "active" ? "closed" : "active";
    setDetail((prev) => (prev ? { ...prev, status: next } : prev));
    try {
      await updateConversationStatus(detail.id, next);
    } catch {
      // Revert on failure; the socket event would otherwise reconcile.
      setDetail((prev) => (prev ? { ...prev, status: detail.status } : prev));
    }
  }

  const collectedEntries = detail ? Object.entries(detail.collected || {}) : [];

  return (
    <div className="flex h-screen">
      {/* Conversation list */}
      <div className="flex w-80 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <p className="text-xs text-slate-500">Live updates over Socket.IO</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <p className="p-4 text-sm text-slate-400">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No conversations yet.</p>
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
                <p className="mt-1 text-xs text-slate-400">
                  {c.contact?.phone_number} · {c.message_count} msg
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Conversation detail */}
      <div className="flex flex-1 flex-col bg-slate-50">
        {!detail ? (
          <div className="flex flex-1 items-center justify-center text-slate-400">
            Select a conversation to view the log
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h3 className="font-semibold">
                  {detail.contact?.name || detail.contact?.phone_number || "Unknown"}
                </h3>
                <p className="text-xs text-slate-500">
                  {detail.contact?.phone_number} · step: {detail.current_step ?? "—"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={detail.status} />
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
                          m.direction === "outbound"
                            ? "text-white/70"
                            : "text-slate-400"
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
          </>
        )}
      </div>
    </div>
  );
}
