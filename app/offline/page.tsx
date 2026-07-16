import type { Metadata } from "next";
import { CloudOff, PawPrint, ShieldCheck } from "lucide-react";
import { OfflineRetry } from "./offline-retry";

export const metadata: Metadata = {
  title: "Offline | Pet Health Memory",
  robots: { index: false, follow: false }
};

export default function OfflinePage() {
  return (
    <main className="auth-safe-shell flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <section className="w-full max-w-lg rounded-xl border border-ink/10 bg-white p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-pine text-white">
            <PawPrint className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase text-pine">Pet Health Memory</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">You are offline</h1>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-pine/15 bg-mist/60 p-4">
          <div className="flex items-start gap-3">
            <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-pine" aria-hidden="true" />
            <div>
              <p className="font-semibold text-ink">Your saved care memory stays on this device.</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Reopen the app when your connection returns to sign in, sync changes, or load anything that has not been saved for offline use yet.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-muted">
          <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-pine" aria-hidden="true" />
          Health records and API responses are never placed in the public application cache.
        </p>
        <OfflineRetry />
      </section>
    </main>
  );
}
