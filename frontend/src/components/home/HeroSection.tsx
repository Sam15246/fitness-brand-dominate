import Link from "next/link";

import AppImage from "@/components/ui/AppImage";

export default function HeroSection() {
  return (
    <section className="relative flex min-h-svh items-end overflow-hidden bg-[#0d0b09] md:items-center">
      <AppImage
        src="/dominate-parallettes-standard.png"
        alt="Training gear"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[center_40%] opacity-[0.28] brightness-75 contrast-110 md:opacity-[0.34]"
      />

      <div
        className="absolute inset-0 bg-gradient-to-t from-[#090705]/96 via-[#090705]/70 to-[#090705]/35 md:bg-[linear-gradient(105deg,rgba(9,7,5,0.92)_0%,rgba(9,7,5,0.55)_55%,rgba(9,7,5,0.20)_100%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-[1240px] px-5 pb-14 pt-20 sm:px-8 sm:pb-20 sm:pt-24 lg:px-10 lg:pb-24 lg:pt-[120px]">
        <div className="mb-6 inline-flex items-center gap-[10px] rounded-full border border-[#a67126]/30 bg-[#a67126]/16 px-4 py-[7px] text-[9.5px] font-bold uppercase tracking-[0.22em] text-[#d4943b]">
          <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-[#d4943b]" aria-hidden="true" />
          Made for Athletes
        </div>

        <h1 className="mb-5 font-display text-[clamp(60px,16vw,120px)] uppercase leading-[0.93] tracking-[0.01em] text-[#f4eee4] md:mb-6 md:text-[clamp(72px,9vw,120px)]">
          Train
          <br />
          Anywhere.
          <br />
          <em className="not-italic text-[#d4943b]">Dominate</em>
          <br />
          Everywhere.
        </h1>

        <p className="mb-9 max-w-[400px] text-[13px] leading-[1.8] text-[#f4eee4]/56 md:mb-11 md:text-[14px]">
          Premium grip tools and bodyweight equipment tested in real training, not just a lab.
        </p>

        <div className="flex flex-wrap flex-col gap-3 sm:flex-row">
          <Link
            href="/products"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#c89e65]/45 bg-[#a67126] px-8 py-[15px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:-translate-y-px hover:bg-[#b97e2e]"
          >
            Shop Now
          </Link>
          <Link
            href="/#why"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#a67126]/38 bg-transparent px-8 py-[15px] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f4eee4]/70 transition-colors hover:bg-[#a67126]/14 hover:text-[#f4eee4]"
          >
            Our Story
          </Link>
        </div>
      </div>

      <div className="absolute bottom-7 left-10 z-10 hidden items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#f4eee4]/26 lg:flex">
        <span className="h-px w-8 bg-[#f4eee4]/20" aria-hidden="true" />
        Scroll to explore
      </div>
    </section>
  );
}
