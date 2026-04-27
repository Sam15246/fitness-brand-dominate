import Link from "next/link";

const CARDS = [
  {
    num: "30%",
    label: "MgCO3 Formula",
    body: "Higher magnesium carbonate than many common liquid chalk products.",
    wide: false,
  },
  {
    num: "0",
    label: "Compromises",
    body: "Solid hardwood, precision details, and athlete-first construction.",
    wide: false,
  },
  {
    num: null,
    label: "Direct from Dominate to You",
    body: "D2C fitness brand from India. Faster delivery, direct support, no middleman markups.",
    wide: true,
  },
] as const;

export default function WhyDominate() {
  return (
    <section id="why" className="relative overflow-hidden bg-[#1e1710] py-[72px] md:py-24">
      <span
        className="pointer-events-none absolute right-[-20px] top-1/2 select-none whitespace-nowrap font-display text-[clamp(100px,18vw,200px)] leading-none tracking-[0.04em] text-[#a67126]/[0.035]"
        aria-hidden="true"
      >
        DOMINATE
      </span>

      <div className="relative z-10 mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4943b]">Why Dominate</p>
            <h2 className="font-display text-[clamp(32px,6vw,52px)] uppercase leading-none tracking-[0.04em] text-[#f4eee4]">
              Made for Athletes.
              <br />
              Built to Last.
            </h2>
            <p className="mt-5 max-w-[380px] text-[13.5px] leading-[1.85] text-[#f4eee4]/44">
              Every product is built around one principle: uncompromising performance with direct support and clean pricing.
            </p>
            <div className="mt-8">
              <Link
                href="/products"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#c89e65]/45 bg-[#a67126] px-8 py-[15px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:-translate-y-px hover:bg-[#b97e2e]"
              >
                Shop the Collection
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {CARDS.map((card) => (
              <div
                key={card.label}
                className={[
                  "rounded-[18px] border p-[22px]",
                  card.wide ? "col-span-2 border-[#a67126]/26 bg-[#a67126]/08" : "border-[#a67126]/14 bg-white/[0.025]",
                ].join(" ")}
              >
                {card.num ? <p className="mb-1 font-display text-[38px] leading-none tracking-[0.02em] text-[#d4943b]">{card.num}</p> : null}
                <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#f4eee4]">{card.label}</p>
                <p className="text-[12px] leading-[1.65] text-[#f4eee4]/40">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
