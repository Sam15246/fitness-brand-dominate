"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 70, suffix: "%", label: "MgCO\u2083 Formula", body: "High magnesium carbonate blend for stronger grip and less slip through hard sets." },
] as const;

function AnimatedNumber({ value, suffix, start }: { value: number; suffix: string; start: boolean }) {
  const [display, setDisplay] = useState(0);
  const animated = useRef(false);

  useEffect(() => {
    if (!start || animated.current) return;
    animated.current = true;
    const duration = 900;
    const animationStart = performance.now();

    function tick(now: number) {
      const elapsed = now - animationStart;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.max(1, Math.round(eased * value)));
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    }

    requestAnimationFrame(tick);
  }, [start, value]);

  if (!start) {
    return (
      <div className="invisible font-display text-[36px] leading-none tracking-[0.02em] text-[#d4943b] sm:text-[44px] md:text-[52px]">
        {value}
        {suffix}
      </div>
    );
  }

  return (
    <div className="font-display text-[36px] leading-none tracking-[0.02em] text-[#d4943b] sm:text-[44px] md:text-[52px]">
      {display}{suffix}
    </div>
  );
}

export default function WhyDominate() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1, rootMargin: "0px 0px -12% 0px" }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="why" className="relative scroll-mt-28 overflow-hidden bg-[#1e1710] py-[72px] md:py-24">
      {/* Large watermark */}
      <span
        className="pointer-events-none absolute right-[-20px] top-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display text-[clamp(100px,18vw,200px)] leading-none tracking-[0.04em] text-[#a67126]/[0.035]"
        aria-hidden="true"
      >
        DOMINATE
      </span>

      <div
        className={`relative z-10 mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10 transition-all duration-700 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
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
                className="group relative inline-flex min-h-[52px] items-center justify-center overflow-hidden rounded-full border border-[#c89e65]/45 bg-[#a67126] px-9 py-[15px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(166,113,38,0.3)]"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                Shop the Collection
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {STATS.map((card) => (
              <div
                key={card.label}
                className="group rounded-[18px] border border-[#a67126]/14 bg-white/[0.025] p-4 transition-colors hover:border-[#a67126]/30 hover:bg-[#a67126]/[0.06] sm:p-[22px]"
              >
                <AnimatedNumber value={card.value} suffix={card.suffix} start={visible} />
                <p className="mb-1.5 mt-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#f4eee4]">{card.label}</p>
                <p className="text-[12px] leading-[1.65] text-[#f4eee4]/40">{card.body}</p>
              </div>
            ))}

            <div className="group rounded-[18px] border border-[#a67126]/18 bg-white/[0.03] p-4 sm:p-[22px]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d4943b]/45 bg-[#a67126]/14 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f4eee4]">
                <svg className="h-3.5 w-3.5 text-[#d4943b]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" />
                </svg>
                Zero Compromise Build
              </span>
              <p className="mt-3 text-[12px] leading-[1.65] text-[#f4eee4]/40">Athlete-first design, clean materials, and durable construction across every DOMINATE product.</p>
            </div>

            {/* Wide card */}
            <div className="col-span-2 rounded-[18px] border border-[#a67126]/26 bg-[#a67126]/8 p-4 transition-colors hover:bg-[#a67126]/12 sm:p-[22px]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#a67126]/16">
                  <svg className="h-5 w-5 text-[#d4943b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#f4eee4]">Direct from Dominate to You</p>
                  <p className="mt-0.5 text-[12px] leading-[1.65] text-[#f4eee4]/40">D2C fitness brand from India. Faster delivery, direct support, no middleman markups.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
