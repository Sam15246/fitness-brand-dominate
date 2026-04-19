import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#2d2219_0%,#0d0b09_48%,#080706_100%)] px-6 py-12 text-[#f4eee4]">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-[#8b6f47]/35 bg-[#14110d]/80 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.4)] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.24em] text-[#b59a73]">DOMINATE Account</p>
        <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.04em]">{title}</h1>
        <p className="mt-2 text-sm text-[#d7c7ad]">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
