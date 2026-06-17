"use client";

import { useEffect, useState } from "react";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
} from "@/lib/api";
import { useUI } from "@/components/ui";

export default function TemplatesPage() {
  const { toast, confirm } = useUI();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setItems(await getTemplates());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function reset() {
    setEditing(null);
    setName("");
    setBody("");
    setError("");
  }

  function startEdit(t) {
    setEditing(t);
    setName(t.name);
    setBody(t.body);
    setError("");
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const wasEditing = Boolean(editing);
      if (editing) await updateTemplate(editing.id, { name, body });
      else await createTemplate({ name, body });
      reset();
      await load();
      toast(wasEditing ? "Template updated" : "Template created", "success");
    } catch (err) {
      setError(err.message);
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    const ok = await confirm({
      title: "Delete template?",
      message: "This action cannot be undone.",
      danger: true,
      confirmLabel: "Delete"
    });
    if (!ok) return;
    await deleteTemplate(id);
    if (editing?.id === id) reset();
    await load();
    toast("Template deleted", "success");
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <h2 className="mb-1 text-2xl font-semibold">Message Templates</h2>
      <p className="mb-6 text-sm text-slate-500">
        Reusable canned messages. Use <code>{"{name}"}</code>-style placeholders if
        you wire them into a flow.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Form */}
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-sm"
        >
          <h3 className="font-semibold">
            {editing ? "Edit template" : "New template"}
          </h3>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Welcome message"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Body
            </label>
            <textarea
              required
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Hi {name}, thanks for reaching out!"
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
            <p className="text-sm text-slate-400">No templates yet.</p>
          ) : (
            items.map((t) => (
              <div key={t.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold">{t.name}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(t)}
                      className="text-sm font-medium text-brand-dark hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(t.id)}
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                  {t.body}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
