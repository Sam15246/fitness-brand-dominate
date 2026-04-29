import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh overflow-x-hidden bg-[#fff8ec]">
      {/* Left brand panel — hidden on mobile */}
      <div className="relative hidden w-[48%] overflow-hidden bg-[#0d0b09] lg:block">
        {/* Radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(166,113,38,0.15)_0%,transparent_70%)]" />

        {/* Grain texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Content */}
        <div className="relative flex h-full flex-col justify-between p-10 lg:p-14">
          {/* Logo */}
          <Link href="/" className="group inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#a67126] transition-transform duration-300 group-hover:scale-105">
              <span className="font-display text-[18px] font-bold text-[#f4eee4]">D</span>
            </div>
            <span className="font-display text-[20px] uppercase tracking-[0.12em] text-[#f4eee4]">
              Dominate
            </span>
          </Link>

          {/* Center — brand statement */}
          <div className="max-w-[360px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">
              Built for athletes
            </p>
            <p className="mt-4 font-display text-[clamp(32px,4vw,48px)] uppercase leading-[0.95] tracking-[0.03em] text-[#f4eee4]">
              Train harder.<br />
              Recover faster.<br />
              <span className="text-[#a67126]">Dominate.</span>
            </p>
            <p className="mt-5 text-[13px] leading-[1.8] text-[#8a7a66]">
              Join thousands of athletes who trust DOMINATE for premium grip tools
              and bodyweight equipment.
            </p>
          </div>

          {/* Bottom — trust indicators */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6c5641]">
              <svg className="h-4 w-4 text-[#a67126]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Secure
            </div>
            <div className="h-3 w-px bg-[#302115]" />
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6c5641]">
              <svg className="h-4 w-4 text-[#a67126]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Fast
            </div>
            <div className="h-3 w-px bg-[#302115]" />
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6c5641]">
              <svg className="h-4 w-4 text-[#a67126]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Trusted
            </div>
          </div>
        </div>

        {/* Decorative DOMINATE watermark */}
        <div className="pointer-events-none absolute -bottom-8 -right-6 select-none font-display text-[140px] uppercase leading-none tracking-[0.04em] text-[#f4eee4]/[0.02]">
          D
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile logo bar */}
        <div className="flex items-center justify-between border-b border-[#d9c8ad]/40 px-5 py-4 lg:hidden">
          <Link href="/" className="group inline-flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#a67126]">
              <span className="font-display text-[14px] font-bold text-[#f4eee4]">D</span>
            </div>
            <span className="font-display text-[16px] uppercase tracking-[0.1em] text-[#302115]">
              Dominate
            </span>
          </Link>
          <Link
            href="/products"
            className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9a7147] transition-colors hover:text-[#6c5641]"
          >
            Shop
          </Link>
        </div>

        {/* Form area — vertically centered on desktop, top-aligned on mobile */}
        <div className="flex min-w-0 flex-1 items-start justify-center overflow-hidden px-5 py-6 sm:px-8 sm:py-8 lg:items-center lg:py-10">
          <div className="w-full min-w-0 max-w-[420px]">
            {/* Header */}
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">
              DOMINATE Account
            </p>
            <h1 className="mt-1.5 font-display text-[clamp(24px,5vw,40px)] uppercase leading-[0.95] tracking-[0.04em] text-[#302115] sm:mt-2">
              {title}
            </h1>
            <p className="mt-2 text-[13px] leading-[1.7] text-[#6c5641] sm:mt-3">{subtitle}</p>

            {/* Form content */}
            <div className="mt-5 sm:mt-8">{children}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#d9c8ad]/40 px-5 py-4 text-center text-[10px] text-[#b5a08a]">
          &copy; {new Date().getFullYear()} DOMINATE. All rights reserved.
        </div>
      </div>
    </div>
  );
}
