"use client";

import { useEffect, useState } from "react";
import { getWhatsAppStatus } from "@/lib/api";
import { getSocket } from "@/lib/socket";

// Live WhatsApp connection pill. Reads the initial status from the API, then
// updates in real time from the "whatsapp:status" Socket.IO event.
export default function ConnectionStatus() {
  const [state, setState] = useState({
    loading: true,
    connected: false,
    hasQR: false
  });

  useEffect(() => {
    let active = true;
    getWhatsAppStatus()
      .then((s) => {
        if (active) setState({ loading: false, ...s });
      })
      .catch(() => {
        if (active) setState({ loading: false, connected: false, hasQR: false });
      });

    const socket = getSocket();
    const onStatus = (s) =>
      setState({ loading: false, connected: s.connected, hasQR: s.hasQR });
    socket?.on("whatsapp:status", onStatus);

    return () => {
      active = false;
      socket?.off("whatsapp:status", onStatus);
    };
  }, []);

  let dot = "bg-slate-400";
  let label = "Checking…";
  if (!state.loading) {
    if (state.connected) {
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
