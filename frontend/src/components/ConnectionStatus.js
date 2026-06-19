"use client";

import { useEffect, useState } from "react";
import { getWhatsAppStatus } from "@/lib/api";

const POLL_MS = 15000;

// WhatsApp connection pill. Polls the status endpoint (the serverless backend
// has no WebSocket to push updates). When the WhatsApp client is intentionally
// disabled — as on the hosted demo — it shows a neutral "Demo mode" badge
// rather than an alarming red "disconnected".
export default function ConnectionStatus() {
  const [state, setState] = useState({
    loading: true,
    enabled: true,
    connected: false,
    hasQR: false
  });

  useEffect(() => {
    let active = true;

    const poll = () =>
      getWhatsAppStatus()
        .then((s) => {
          if (active) setState({ loading: false, ...s });
        })
        .catch(() => {
          if (active)
            setState({
              loading: false,
              enabled: true,
              connected: false,
              hasQR: false
            });
        });

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  let dot = "bg-slate-400";
  let label = "Checking…";
  if (!state.loading) {
    if (state.enabled === false) {
      dot = "bg-slate-400";
      label = "Demo mode";
    } else if (state.connected) {
      dot = "bg-green-500";
      label = "WhatsApp connected";
    } else if (state.hasQR) {
      dot = "bg-amber-500";
      label = "Scan QR to connect";
    } else {
      dot = "bg-red-500";
      label = "WhatsApp disconnected";
    }
  }

  return (
    <span className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
