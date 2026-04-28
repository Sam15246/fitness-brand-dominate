import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | DOMINATE",
  description: "DOMINATE builds functional strength equipment for athletes who train with intent.",
};

const VALUES = [
  {
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    title: "Built to Last",
    description: "Every piece is crafted from premium materials — designed to endure thousands of reps without compromise.",
  },
  {
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    title: "Performance First",
    description: "No gimmicks. Every product solves a real training problem with thoughtful, athlete-tested design.",
  },
  {
    icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Direct to You",
    description: "No middlemen, no retail markup. Premium equipment at honest prices, shipped straight to your door.",
  },
  {
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    title: "Community Driven",
    description: "Built by athletes, for athletes. Your feedback shapes every product we make.",
  },
];

const STATS = [
  { value: "5,000+", label: "Athletes Trust Us" },
  { value: "15+", label: "Products Crafted" },
  { value: "24h", label: "Avg. Dispatch Time" },
  { value: "4.8", label: "Avg. Rating" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#fff8ec]">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-[#0d0b09]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(166,113,38,0.15)_0%,transparent_70%)]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24 lg:px-10 lg:py-32">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">Our Story</p>
          <h1 className="mt-4 max-w-[600px] font-display text-[clamp(36px,7vw,64px)] uppercase leading-[0.92] tracking-[0.03em] text-[#f4eee4]">
            Train Harder.<br />
            Recover Faster.<br />
            <span className="text-[#a67126]">Dominate.</span>
          </h1>
          <p className="mt-6 max-w-[480px] text-[14px] leading-[1.8] text-[#8a7a66]">
            DOMINATE builds functional strength equipment for athletes who train with intent.
            Our focus is durable craftsmanship, practical design, and performance-first training tools.
          </p>
          {/* Scroll hint */}
          <div className="mt-10 flex items-center gap-2 text-[#8a7a66]/60 sm:mt-14">
            <div className="h-8 w-[1px] bg-gradient-to-b from-[#a67126]/40 to-transparent" />
            <span className="text-[9px] uppercase tracking-[0.2em]">Scroll to explore</span>
          </div>
        </div>
        {/* Watermark */}
        <div className="pointer-events-none absolute -bottom-10 -right-4 select-none font-display text-[180px] uppercase leading-none tracking-[0.04em] text-[#f4eee4]/[0.02] sm:text-[240px]">
          D
        </div>
      </div>

      {/* ── Mission ── */}
      <div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
        <div className="mx-auto max-w-[680px] text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">Our Mission</p>
          <h2 className="mt-3 font-display text-[clamp(24px,4vw,36px)] uppercase tracking-[0.04em] text-[#302115]">
            Equipment That Works As Hard As You Do
          </h2>
          <div className="mx-auto mt-4 h-[2px] w-12 rounded-full bg-gradient-to-r from-transparent via-[#a67126]/50 to-transparent" />
          <p className="mt-5 text-[14px] leading-[1.8] text-[#6c5641]">
            Whether you train at home, in a studio, or outdoors, our mission is the same: help you train
            anywhere and dominate everywhere. We believe premium equipment shouldn&apos;t cost a premium — so we
            cut out the middlemen and bring world-class tools directly to your door.
          </p>
        </div>

        {/* Stats */}
        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="group rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 text-center transition-all hover:-translate-y-0.5 hover:border-[#a67126]/30 hover:shadow-[0_8px_24px_rgba(146,104,56,0.1)]"
            >
              <p className="font-display text-[clamp(28px,4vw,40px)] tracking-[0.02em] text-[#302115] transition-colors group-hover:text-[#a67126]">
                {stat.value}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9a7147]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Values ── */}
      <div className="border-y border-[#d9c8ad]/40 bg-[#fffefb]">
        <div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">What We Stand For</p>
            <h2 className="mt-3 font-display text-[clamp(24px,4vw,36px)] uppercase tracking-[0.04em] text-[#302115]">
              Our Values
            </h2>
            <div className="mx-auto mt-4 h-[2px] w-12 rounded-full bg-gradient-to-r from-transparent via-[#a67126]/50 to-transparent" />
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {VALUES.map((value, i) => (
              <div
                key={value.title}
                className="group relative rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-6 transition-all hover:-translate-y-0.5 hover:border-[#a67126]/30 hover:shadow-[0_8px_24px_rgba(146,104,56,0.1)]"
              >
                {/* Number watermark */}
                <span className="pointer-events-none absolute right-5 top-4 select-none font-display text-[48px] leading-none tracking-tight text-[#d9c8ad]/20">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#a67126]/10 transition-colors group-hover:bg-[#a67126]/15">
                  <svg className="h-5 w-5 text-[#a67126]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={value.icon} />
                  </svg>
                </div>
                <h3 className="mt-4 font-display text-[18px] uppercase tracking-[0.04em] text-[#302115]">
                  {value.title}
                </h3>
                <p className="mt-2 text-[13px] leading-[1.7] text-[#6c5641]">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="relative overflow-hidden bg-[#0d0b09]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(166,113,38,0.12)_0%,transparent_70%)]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative mx-auto max-w-[1240px] px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
          <div className="mx-auto max-w-[560px] text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">Ready to Train?</p>
            <h2 className="mt-3 font-display text-[clamp(24px,4vw,36px)] uppercase tracking-[0.04em] text-[#f4eee4]">
              Join the Movement
            </h2>
            <div className="mx-auto mt-4 h-[2px] w-12 rounded-full bg-gradient-to-r from-transparent via-[#a67126]/50 to-transparent" />
            <p className="mt-5 text-[14px] leading-[1.8] text-[#8a7a66]">
              Explore our collection and find the gear that matches your ambition.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/products"
                className="group relative inline-flex overflow-hidden rounded-full bg-[#a67126] px-7 py-[15px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#fff8ec] transition-all hover:bg-[#b8832f] hover:shadow-[0_4px_20px_rgba(166,113,38,0.35)]"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative">Shop Products</span>
              </Link>
              <Link
                href="/contact"
                className="inline-flex rounded-full border border-[#8a7a66]/30 px-7 py-[15px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a7a66] transition-all hover:border-[#a67126]/50 hover:text-[#f4eee4]"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
