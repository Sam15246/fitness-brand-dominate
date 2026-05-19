const COMMUNITY_CARDS = [
  {
    title: "Training clips",
    meta: "Movement culture",
    body: "Short-form sessions, athlete snippets, and real training energy from the community.",
  },
  {
    title: "Local sessions",
    meta: "Gym floors + outdoor rigs",
    body: "Pop-ups and collaborations that keep DOMINATE visible where training actually happens.",
  },
  {
    title: "Athlete stories",
    meta: "Discipline over hype",
    body: "Build a brand that reflects consistency, progression, and the mindset behind the work.",
  },
] as const;

export default function CommunitySection() {
  return (
    <section id="community" className="relative overflow-hidden bg-[#0d0b09] py-[72px] md:py-24">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 0%, rgba(166,113,38,0.14) 0%, transparent 34%), radial-gradient(circle at 10% 80%, rgba(255,255,255,0.04) 0%, transparent 24%)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[620px] animate-[fadeInUp_0.7s_ease-out_both]">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4943b]">Community / Brand Positioning</p>
            <h2 className="font-display text-[clamp(34px,6vw,56px)] uppercase leading-[0.95] tracking-[0.04em] text-[#f4eee4]">
              Built by athletes.
            </h2>
            <p className="mt-4 max-w-[560px] text-[13.5px] leading-[1.85] text-[#f4eee4]/46 md:text-[14px]">
              DOMINATE exists for athletes who refuse average. Built around calisthenics, movement, strength, and discipline.
            </p>
          </div>

          <div className="hidden text-right md:block">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#f4eee4]/18">Live community feed</p>
            <p className="mt-2 max-w-[220px] text-[12px] leading-[1.7] text-[#f4eee4]/38">
              A visual language for athlete culture, content, and training momentum.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-[#a67126]/12 bg-white/[0.03] p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-[#d4943b]">Visual reel</p>
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#f4eee4]/24">Subtle motion loop</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {COMMUNITY_CARDS.map((card, index) => (
                <article
                  key={card.title}
                  className="group relative overflow-hidden rounded-[22px] border border-[#a67126]/12 bg-[#090705] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#a67126]/26 hover:shadow-[0_18px_40px_rgba(0,0,0,0.25)]"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(166,113,38,0.12)_0%,transparent_55%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
                  <div className="relative z-10">
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#d4943b]">{card.meta}</p>
                    <h3 className="mt-3 font-display text-[28px] uppercase tracking-[0.03em] text-[#f4eee4]">{card.title}</h3>
                    <p className="mt-3 text-[12px] leading-[1.8] text-[#f4eee4]/40">{card.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-[#a67126]/12 bg-[#1e1710] p-5 md:p-6">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-[#d4943b]">Movement culture</p>
              <p className="mt-3 max-w-[320px] text-[15px] leading-[1.8] text-[#f4eee4]/56">
                The brand should feel alive: clips, sessions, athlete milestones, and the grind behind the product.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#a67126]/12 bg-white/[0.03] p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-[#d4943b]">Social pulse</p>
                <span className="rounded-full border border-[#a67126]/14 px-3 py-1 text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#f4eee4]/28">
                  Live placeholders
                </span>
              </div>
              <div className="space-y-3">
                {[
                  "30-sec chalk break test",
                  "Outdoor rig session edit",
                  "Community drop at a partner gym",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#a67126]/10 bg-[#090705] px-4 py-3">
                    <div className="h-9 w-9 rounded-full bg-[#a67126]/12" aria-hidden="true" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f4eee4]/40">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}