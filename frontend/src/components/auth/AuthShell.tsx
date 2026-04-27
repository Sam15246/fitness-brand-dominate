import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-8 text-[#302115] sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-[#d9c8ad] bg-[#fffaf2]/95 p-6 shadow-[0_18px_60px_rgba(146,104,56,0.12)] backdrop-blur sm:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-[#9a7147]">DOMINATE Account</p>
        <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.04em] text-[#3b2513]">{title}</h1>
        <p className="mt-2 text-sm text-[#6f5640]">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
