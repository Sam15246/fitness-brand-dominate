"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "How long does one bottle of liquid chalk last?",
    a: "For regular training, one bottle usually lasts 4 to 6 weeks depending on usage.",
  },
  {
    q: "Are the parallettes suitable for beginners?",
    a: "Yes. The base is stable enough for beginners and strong enough for advanced progressions.",
  },
  {
    q: "How do I care for wooden parallettes?",
    a: "Wipe with a dry or lightly damp cloth. Avoid soaking. Optional oiling helps long-term finish.",
  },
  {
    q: "What is your shipping and return policy?",
    a: "Shipping runs across India. Free shipping above Rs. 799. Contact support for return requests within policy window.",
  },
  {
    q: "Can I track my order after placing it?",
    a: "Yes. Use the Track Order page with your order number and email for latest status updates.",
  },
] as const;

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-[#fff8ec] py-[72px] md:py-24">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="mb-11 md:mx-auto md:mb-[52px] md:max-w-[560px] md:text-center">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">Got Questions?</p>
          <h2 className="font-display text-[clamp(32px,6vw,52px)] uppercase leading-none tracking-[0.04em] text-[#302115]">
            Frequently Asked
          </h2>
        </div>

        <div className="mx-auto flex max-w-[760px] flex-col gap-3">
          {FAQS.map((item, index) => {
            const isOpen = open === index;
            return (
              <div
                key={item.q}
                className={[
                  "overflow-hidden rounded-2xl border transition-all duration-300",
                  isOpen
                    ? "border-[#a67126]/30 bg-[#fff8ec] shadow-[0_8px_28px_rgba(146,104,56,0.1)]"
                    : "border-[#d9c8ad] bg-[#fff8ec] shadow-[0_2px_8px_rgba(146,104,56,0.04)] hover:border-[#a67126]/25 hover:shadow-[0_4px_16px_rgba(146,104,56,0.08)]",
                ].join(" ")}
              >
                <button
                  className="flex w-full items-center justify-between gap-3 px-5 py-5 text-left transition-colors sm:gap-4 sm:px-7 sm:py-6"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : index)}
                >
                  <span className="flex items-start gap-3 sm:gap-4">
                    <span className="mt-0.5 hidden font-display text-[18px] leading-none text-[#a67126]/30 sm:block">
                      0{index + 1}
                    </span>
                    <span className="text-[14px] font-semibold tracking-[0.01em] text-[#302115]">{item.q}</span>
                  </span>
                  <span
                    className={[
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                      isOpen
                        ? "rotate-45 border-[#a67126] bg-[#a67126]/10 text-[#a67126]"
                        : "border-[#d9c8ad] text-[#a67126]/60",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                </button>

                <div
                  className="grid transition-all duration-300 ease-in-out"
                  style={{
                    gridTemplateRows: isOpen ? "1fr" : "0fr",
                  }}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 pb-6 text-[13.5px] leading-[1.78] text-[#6c5641] sm:px-7 sm:pl-[4.5rem]">
                      {item.a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
