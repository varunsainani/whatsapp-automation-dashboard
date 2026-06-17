"use client";

import { useEffect, useState } from "react";
import {
  getFlows,
  createFlow,
  updateFlow,
  activateFlow,
  deleteFlow
} from "@/lib/api";
import { useUI } from "@/components/ui";

const emptyStep = (type = "say") => ({ type, text: "", key: "" });

export default function FlowsPage() {
  const { toast, confirm } = useUI();
  const [flows, setFlows] = useState([]);
  const [editing, setEditing] = useState(null); // null = creating a new flow
  const [name, setName] = useState("");
  const [steps, setSteps] = useState([emptyStep()]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setFlows(await getFlows());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditing(null);
    setName("");
    setSteps([emptyStep()]);
    setError("");
  }

  function startEdit(flow) {
    setEditing(flow);
    setName(flow.name);
    setSteps(
      flow.steps && flow.steps.length
        ? flow.steps.map((s) => ({
            type: s.type,
            text: s.text || "",
            key: s.key || ""
          }))
        : [emptyStep()]
    );
    setError("");
  }

  function updateStep(index, patch) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, emptyStep()]);
  }

  function removeStep(index) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function moveStep(index, dir) {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function buildSteps() {
    return steps.map((s) =>
      s.type === "ask"
        ? { type: "ask", text: s.text, key: s.key }
        : { type: "say", text: s.text }
    );
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const wasEditing = Boolean(editing);
      const payload = { name, steps: buildSteps() };
      if (editing) {
        await updateFlow(editing.id, payload);
      } else {
        await createFlow(payload);
        startNew();
      }
      await load();
      toast(wasEditing ? "Flow updated" : "Flow created", "success");
    } catch (err) {
      setError(err.message);
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function onActivate(id) {
    await activateFlow(id);
    await load();
    toast("Flow activated", "success");
  }

  async function onDelete(id) {
    const ok = await confirm({
      title: "Delete flow?",
      message: "This action cannot be undone.",
      danger: true,
      confirmLabel: "Delete"
    });
    if (!ok) return;
    await deleteFlow(id);
    if (editing?.id === id) startNew();
    await load();
    toast("Flow deleted", "success");
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Conversation Flows</h2>
          <p className="text-sm text-slate-500">
            The active flow drives the bot. Use <code>{"{key}"}</code> to echo
            collected answers.
          </p>
        </div>
        <button
          onClick={startNew}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100"
        >
          + New flow
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Flow list */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : flows.length === 0 ? (
            <p className="text-sm text-slate-400">No flows yet.</p>
          ) : (
            flows.map((f) => (
              <div
                key={f.id}
                className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ${
                  editing?.id === f.id ? "ring-brand" : "ring-transparent"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{f.name}</h4>
                    {f.is_active ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        active
                      </span>
                    ) : null}
                  </div>
                  <div className="flex gap-3">
                    {!f.is_active ? (
                      <button
                        onClick={() => onActivate(f.id)}
                        className="text-sm font-medium text-brand-dark hover:underline"
                      >
                        Activate
                      </button>
                    ) : null}
                    <button
                      onClick={() => startEdit(f)}
                      className="text-sm font-medium text-slate-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(f.id)}
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <ol className="mt-3 space-y-1 text-sm text-slate-600">
                  {(f.steps || []).map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span
                        className={`mt-0.5 h-fit rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          s.type === "ask"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {s.type}
                      </span>
                      <span className="flex-1">
                        {s.text}
                        {s.type === "ask" ? (
                          <em className="text-slate-400"> → {s.key}</em>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))
          )}
        </div>

        {/* Editor */}
        <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">
            {editing ? `Edit "${editing.name}"` : "New flow"}
          </h3>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Flow name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Lead capture"
            />
          </div>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Steps
          </label>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <select
                    value={step.type}
                    onChange={(e) => updateStep(index, { type: e.target.value })}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-brand focus:outline-none"
                  >
                    <option value="say">say (send a message)</option>
                    <option value="ask">ask (collect an answer)</option>
                  </select>
                  <div className="flex items-center gap-2 text-slate-400">
                    <button
                      type="button"
                      onClick={() => moveStep(index, -1)}
                      className="hover:text-slate-700"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStep(index, 1)}
                      className="hover:text-slate-700"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="text-red-500 hover:text-red-700"
                      aria-label="Remove step"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <textarea
                  required
                  rows={2}
                  value={step.text}
                  onChange={(e) => updateStep(index, { text: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="Message text…"
                />
                {step.type === "ask" ? (
                  <input
                    required
                    value={step.key}
                    onChange={(e) => updateStep(index, { key: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    placeholder="Save answer as (e.g. email)"
                  />
                ) : null}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addStep}
            className="mt-3 w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
          >
            + Add step
          </button>

          {error ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {saving ? "Saving…" : editing ? "Update flow" : "Create flow"}
            </button>
            {editing ? (
              <button
                type="button"
                onClick={startNew}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
