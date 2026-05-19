import Link from "next/link";

export default function CTAStrip() {
  return (
    <section className="relative overflow-hidden bg-[#0d0b09] py-16 sm:py-24 md:py-32">
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 70% at 50% 110%, rgba(166,113,38,0.16) 0%, transparent 60%)" }}
        aria-hidden="true"
      />

      {/* Animated grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
        aria-hidden="true"
      />

      {/* Large watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden="true">
        <span className="select-none whitespace-nowrap font-display text-[clamp(100px,22vw,280px)] uppercase leading-none tracking-[0.06em] text-[#a67126]/[0.03]">
          DOMINATE
        </span>
      </div>

      <div className="relative z-10 mx-auto max-w-[1240px] px-5 text-center sm:px-8 lg:px-10">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4943b]">Ready to train</p>
        <h2 className="mb-5 font-display text-[clamp(36px,10vw,96px)] uppercase leading-[0.93] tracking-[0.03em] text-[#f4eee4]">
          Your <em className="not-italic text-[#d4943b]">Edge</em>
          <br />
          Starts Here.
        </h2>
        <p className="mx-auto mb-11 max-w-[380px] text-[13px] leading-[1.75] text-[#f4eee4]/44">
          Get your grip tools delivered fast. Explore our full catalog and start training with equipment that means business.
        </p>

        <div className="flex flex-col items-center gap-3">
          <Link
            href="/products"
            className="group relative inline-flex w-full max-w-[420px] min-h-[52px] items-center justify-center overflow-hidden rounded-full border border-[#c89e65]/45 bg-[#a67126] px-6 py-3 text-[15px] font-bold uppercase tracking-[0.12em] text-[#f4eee4] transition-all hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(166,113,38,0.35)]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            Shop Now
          </Link>

          <Link href="/order/status" className="mt-2 text-[14px] text-[#f4eee4]/70 hover:text-[#f4eee4]">Track My Order</Link>
        </div>
      </div>
    </section>
  );
}
