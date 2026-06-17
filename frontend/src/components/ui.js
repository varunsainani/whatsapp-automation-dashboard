"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

const UIContext = createContext(null);

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) {
    throw new Error("useUI must be used within <UIProvider>");
  }
  return ctx;
}

const TOAST_STYLES = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-slate-800"
};

// App-wide toasts + a promise-based confirm dialog, so feature code can call
// toast("Saved", "success") and `await confirm({...})` instead of window.alert.
export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const idRef = useRef(0);

  const toast = useCallback((message, type = "info") => {
    idRef.current += 1;
    const id = idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const confirm = useCallback(
    (opts) => new Promise((resolve) => setConfirmState({ ...opts, resolve })),
    []
  );

  function resolveConfirm(result) {
    if (confirmState) confirmState.resolve(result);
    setConfirmState(null);
  }

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-lg px-4 py-2 text-sm font-medium text-white shadow-lg ${
              TOAST_STYLES[t.type] || TOAST_STYLES.info
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {confirmState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">
              {confirmState.title || "Are you sure?"}
            </h3>
            {confirmState.message ? (
              <p className="mt-2 text-sm text-slate-600">{confirmState.message}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => resolveConfirm(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100"
              >
                {confirmState.cancelLabel || "Cancel"}
              </button>
              <button
                onClick={() => resolveConfirm(true)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                  confirmState.danger
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-brand hover:bg-brand-dark"
                }`}
              >
                {confirmState.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </UIContext.Provider>
  );
}
