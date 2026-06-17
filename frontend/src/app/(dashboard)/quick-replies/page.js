"use client";

import { useEffect, useState } from "react";
import {
  getQuickReplies,
  createQuickReply,
  updateQuickReply,
  deleteQuickReply
} from "@/lib/api";
import { useUI } from "@/components/ui";

export default function QuickRepliesPage() {
  const { toast, confirm } = useUI();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [label, setLabel] = useState("");
  const [responseText, setResponseText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setItems(await getQuickReplies());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function reset() {
    setEditing(null);
    setLabel("");
    setResponseText("");
    setError("");
  }

  function startEdit(q) {
    setEditing(q);
    setLabel(q.label);
    setResponseText(q.response_text);
    setError("");
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const wasEditing = Boolean(editing);
      const body = { label, response_text: responseText };
      if (editing) await updateQuickReply(editing.id, body);
      else await createQuickReply(body);
      reset();
      await load();
      toast(wasEditing ? "Quick reply updated" : "Quick reply created", "success");
    } catch (err) {
      setError(err.message);
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    const ok = await confirm({
      title: "Delete quick reply?",
      message: "This action cannot be undone.",
      danger: true,
      confirmLabel: "Delete"
    });
    if (!ok) return;
    await deleteQuickReply(id);
    if (editing?.id === id) reset();
    await load();
    toast("Quick reply deleted", "success");
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <h2 className="mb-1 text-2xl font-semibold">Quick Replies</h2>
      <p className="mb-6 text-sm text-slate-500">
        Short labelled responses agents can fire with one tap.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Form */}
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-sm"
        >
          <h3 className="font-semibold">
            {editing ? "Edit quick reply" : "New quick reply"}
          </h3>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Label
            </label>
            <input
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Pricing"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Response text
            </label>
            <textarea
              required
              rows={4}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Our plans start at $10/month."
            />
          </div>
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </button>
            {editing ? (
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-400">No quick replies yet.</p>
          ) : (
            items.map((q) => (
              <div key={q.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand-dark">
                    {q.label}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(q)}
                      className="text-sm font-medium text-brand-dark hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(q.id)}
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                  {q.response_text}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
