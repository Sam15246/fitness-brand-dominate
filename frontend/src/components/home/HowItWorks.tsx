"use client";

import { useState } from "react";

import AppImage from "@/components/ui/AppImage";

const TABS = [
  {
    id: "chalk",
    label: "Liquid Chalk",
    img: "/liquid-chalk-dominate200ml.png",
    steps: [
      {
        n: "01",
        title: "Shake the bottle",
        body: "Give it a good shake for even formula coverage before each session.",
      },
      {
        n: "02",
        title: "Apply to palms",
        body: "Use a small amount and let it dry for 15 to 20 seconds.",
      },
      {
        n: "03",
        title: "Train without limits",
        body: "Grip stays reliable across multiple sets with less mess.",
      },
    ],
  },
  {
    id: "bars",
    label: "Wooden Parallettes",
    img: "/dominate-parallettes-standard.png",
    steps: [
      {
        n: "01",
        title: "Unbox and inspect",
        body: "Check build quality and finish before your first session.",
      },
      {
        n: "02",
        title: "Set up anywhere",
        body: "Place on a flat surface for stable handstand and dip training.",
      },
      {
        n: "03",
        title: "Train every day",
        body: "Use for handstands, dips, L-sits, and progression movements.",
      },
    ],
  },
] as const;

export default function HowItWorks() {
  const [active, setActive] = useState<"chalk" | "bars">("chalk");
  const tab = TABS.find((entry) => entry.id === active)!;

  return (
    <section id="how" className="bg-[#f5e7d2] py-[72px] md:py-24">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="mb-10 md:mb-11">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">Usage Guide</p>
          <h2 className="font-display text-[clamp(32px,6vw,52px)] uppercase leading-none tracking-[0.04em] text-[#302115]">
            How It Works
          </h2>
        </div>

        <div className="mb-8 flex flex-col gap-2 sm:flex-row">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setActive(entry.id as typeof active)}
              aria-selected={active === entry.id}
              className={[
                "w-full h-12 rounded-full px-5 text-[13px] font-bold uppercase tracking-[0.12em] transition-colors",
                active === entry.id
                  ? "border-transparent bg-[#1e1710] text-[#f4eee4]"
                  : "border-[#d9c8ad] bg-transparent text-[#6c5641] hover:border-[#a67126]/40",
              ].join(" ")}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
          <ol className="flex list-none flex-col gap-6 md:gap-8">
            {tab.steps.map((step) => (
              <li key={step.n} className="flex items-start gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#a67126] text-[18px] font-display font-bold leading-none text-[#1e1710]">
                  {step.n}
                </span>
                <div>
                  <p className="mb-1.5 text-[15px] font-bold uppercase tracking-[0.08em] text-[#302115]">{step.title}</p>
                  <p className="text-[14px] leading-[1.7] text-[#6c5641]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="overflow-hidden rounded-2xl shadow-[0_16px_50px_rgba(146,104,56,0.14)]">
            <AppImage key={tab.id} src={tab.img} alt={tab.label} width={800} height={600} sizes="(max-width: 1024px) 100vw, 50vw" className="aspect-[16/9] w-full object-cover transition-opacity duration-400" />
          </div>
        </div>
      </div>
    </section>
  );
}
