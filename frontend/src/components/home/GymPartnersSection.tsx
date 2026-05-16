import Link from "next/link";

const PARTNER_POINTS = [
  {
    title: "Bulk gym supply",
    body: "Equip training spaces with premium calisthenics and strength essentials built for consistent use.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    title: "Exclusive partner pricing",
    body: "Simple, premium partnership tiers designed for gyms that want a direct brand relationship.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-3.5 0-6 1.5-6 4s2.5 4 6 4 6 1.5 6 4-2.5 4-6 4m0-16v16m0-16c2 0 4 1 5 2.5M12 8c-2 0-4 1-5 2.5" />
      </svg>
    ),
  },
  {
    title: "Fast local delivery",
    body: "Responsive fulfillment so partner gyms can keep members training without long downtime.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Athlete-focused products",
    body: "Designed around grip, movement, and durability instead of generic gym catalog thinking.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "Community collaborations",
    body: "Launch workshops, athlete meetups, and local movement sessions that bring more energy into your gym.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
] as const;

const GYM_LOGOS = ["IRON HOUSE", "FLOW ACADEMY", "BAR STATE", "MOVE CLUB", "STRENGTH LAB"] as const;

export default function GymPartnersSection() {
  return (
    <section id="gym-partners" className="relative overflow-hidden bg-[#1e1710] py-[72px] md:py-24">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at 18% 18%, rgba(166,113,38,0.18) 0%, transparent 28%), radial-gradient(circle at 82% 20%, rgba(212,148,59,0.12) 0%, transparent 24%), radial-gradient(circle at 50% 100%, rgba(255,255,255,0.04) 0%, transparent 48%)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="mb-11 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[640px] animate-[fadeInUp_0.7s_ease-out_both]">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4943b]">DOMINATE FOR GYMS</p>
            <h2 className="font-display text-[clamp(34px,6vw,58px)] uppercase leading-[0.95] tracking-[0.04em] text-[#f4eee4]">
              Built for gyms. Built for athletes.
            </h2>
            <p className="mt-4 max-w-[540px] text-[13.5px] leading-[1.85] text-[#f4eee4]/48 md:text-[14px]">
              Partner with DOMINATE and bring premium calisthenics & fitness essentials to your members.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 animate-[fadeInUp_0.7s_ease-out_0.15s_both]">
            <Link
              href="/contact"
              className="group relative inline-flex min-h-[52px] items-center justify-center overflow-hidden rounded-full border border-[#c89e65]/45 bg-[#a67126] px-8 py-[15px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(166,113,38,0.3)]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              Partner With Us
            </Link>
            <Link
              href="/training"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[#a67126]/38 bg-transparent px-8 py-[15px] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f4eee4]/72 transition-all hover:border-[#a67126]/60 hover:bg-[#a67126]/14 hover:text-[#f4eee4]"
            >
              Become a DOMINATE Gym
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {PARTNER_POINTS.map((point, index) => (
            <article
              key={point.title}
              className="group rounded-[22px] border border-[#a67126]/12 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#a67126]/28 hover:bg-[#a67126]/[0.08] hover:shadow-[0_18px_40px_rgba(0,0,0,0.25)] md:p-6 xl:col-span-1"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#a67126]/12 text-[#d4943b] transition-colors group-hover:bg-[#a67126]/18">
                {point.icon}
              </div>
              <h3 className="font-display text-[24px] uppercase tracking-[0.03em] text-[#f4eee4]">{point.title}</h3>
              <p className="mt-2 text-[12px] leading-[1.8] text-[#f4eee4]/42">{point.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-[28px] border border-[#a67126]/14 bg-[#090705]/70 p-5 backdrop-blur-sm md:mt-7 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-[#d4943b]">Trusted by local gyms & athletes</p>
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#f4eee4]/22">Placeholder logo strip</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {GYM_LOGOS.map((logo) => (
              <div
                key={logo}
                className="flex min-h-[64px] items-center justify-center rounded-2xl border border-[#a67126]/10 bg-white/[0.02] px-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f4eee4]/30 transition-colors hover:border-[#a67126]/24 hover:text-[#f4eee4]/44"
              >
                {logo}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}