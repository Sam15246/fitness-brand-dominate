import Link from "next/link";

export default function CTAStrip() {
  return (
    <section className="relative overflow-hidden bg-[#0d0b09] py-20 md:py-28">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 80% at 50% 110%, rgba(166,113,38,0.13) 0%, transparent 60%)" }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-[1240px] px-5 text-center sm:px-8 lg:px-10">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4943b]">Ready to train</p>
        <h2 className="mb-4 font-display text-[clamp(52px,10vw,96px)] uppercase leading-[0.93] tracking-[0.03em] text-[#f4eee4]">
          Your <em className="not-italic text-[#d4943b]">Edge</em>
          <br />
          Starts Here.
        </h2>
        <p className="mx-auto mb-10 max-w-[360px] text-[13px] leading-[1.75] text-[#f4eee4]/44">
          Get your grip tools delivered fast. Explore our full catalog and start training with equipment that means business.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/products"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#c89e65]/45 bg-[#a67126] px-8 py-[15px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:-translate-y-px hover:bg-[#b97e2e]"
          >
            Shop Now
          </Link>
          <Link
            href="/order/status"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#a67126]/38 bg-transparent px-8 py-[15px] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f4eee4]/70 transition-colors hover:bg-[#a67126]/14 hover:text-[#f4eee4]"
          >
            Track My Order
          </Link>
        </div>
      </div>
    </section>
  );
}
