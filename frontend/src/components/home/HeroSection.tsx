import Link from "next/link";

import AppImage from "@/components/ui/AppImage";

export default function HeroSection() {
  return (
    <section className="relative flex min-h-svh items-end overflow-hidden bg-[#0d0b09] md:items-center">
      {/* Ken-Burns animated background */}
      <div className="absolute inset-0 animate-[kenburns_25s_ease-in-out_infinite_alternate]">
        <AppImage
          src="/dominate-parallettes-standard.png"
          alt="Training gear"
          fill
          priority
          loading="eager"
          sizes="100vw"
          className="object-cover object-[center_40%] opacity-[0.28] brightness-75 contrast-110 md:opacity-[0.34]"
        />
      </div>

      {/* Gradient overlays */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#090705]/96 via-[#090705]/70 to-[#090705]/35 md:bg-[linear-gradient(105deg,rgba(9,7,5,0.92)_0%,rgba(9,7,5,0.55)_55%,rgba(9,7,5,0.20)_100%)]"
        aria-hidden="true"
      />

      {/* Subtle grain texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-[1240px] px-5 pb-14 pt-20 sm:px-8 sm:pb-20 sm:pt-24 lg:px-10 lg:pb-24 lg:pt-[120px]">
        {/* Badge — fade in */}
        <div className="mb-6 inline-flex animate-[fadeInUp_0.6s_ease-out_0.2s_both] items-center gap-[10px] rounded-full border border-[#a67126]/30 bg-[#a67126]/16 px-4 py-[7px] text-[9.5px] font-bold uppercase tracking-[0.22em] text-[#d4943b]">
          <span className="h-[5px] w-[5px] shrink-0 animate-pulse rounded-full bg-[#d4943b]" aria-hidden="true" />
          Made for Athletes
        </div>

        {/* Headline — staggered lines */}
        <h1 className="mb-5 font-display text-[clamp(60px,16vw,120px)] uppercase leading-[0.93] tracking-[0.01em] text-[#f4eee4] md:mb-6 md:text-[clamp(72px,9vw,120px)]">
          <span className="inline-block animate-[fadeInUp_0.7s_ease-out_0.3s_both]">Train</span>
          <br />
          <span className="inline-block animate-[fadeInUp_0.7s_ease-out_0.45s_both]">Anywhere.</span>
          <br />
          <em className="inline-block animate-[fadeInUp_0.7s_ease-out_0.6s_both] not-italic text-[#d4943b]">Dominate</em>
          <br />
          <span className="inline-block animate-[fadeInUp_0.7s_ease-out_0.75s_both]">Everywhere.</span>
        </h1>

        {/* Subtext */}
        <p className="mb-9 max-w-[400px] animate-[fadeInUp_0.7s_ease-out_0.9s_both] text-[13px] leading-[1.8] text-[#f4eee4]/56 md:mb-11 md:text-[14px]">
          Premium grip tools and bodyweight equipment tested in real training, not just a lab.
        </p>

        {/* Buttons */}
        <div className="flex animate-[fadeInUp_0.7s_ease-out_1.05s_both] flex-col flex-wrap gap-3 sm:flex-row">
          <Link
            href="/products"
            className="group relative inline-flex min-h-[52px] items-center justify-center overflow-hidden rounded-full border border-[#c89e65]/45 bg-[#a67126] px-9 py-[15px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(166,113,38,0.3)]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            Shop Now
          </Link>
          <Link
            href="/#why"
            className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[#a67126]/38 bg-transparent px-9 py-[15px] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f4eee4]/70 transition-all hover:border-[#a67126]/60 hover:bg-[#a67126]/14 hover:text-[#f4eee4]"
          >
            Our Story
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-7 left-10 z-10 hidden animate-[fadeInUp_0.7s_ease-out_1.4s_both] items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#f4eee4]/26 lg:flex">
        <span className="h-px w-8 bg-[#f4eee4]/20" aria-hidden="true" />
        Scroll to explore
        <span className="mt-0.5 animate-bounce text-[14px] leading-none text-[#f4eee4]/20" aria-hidden="true">&darr;</span>
      </div>
    </section>
  );
}
