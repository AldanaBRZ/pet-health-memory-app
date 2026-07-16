"use client";

import { RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineRetry() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.location.assign("/")}
      className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-pine px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-ink"
    >
      <RefreshCcw className="h-4 w-4" aria-hidden="true" />
      {isOnline ? "Return to Pet Memory" : "Try again"}
    </button>
  );
}
