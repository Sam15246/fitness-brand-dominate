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

        <div className="mx-auto flex max-w-[760px] flex-col gap-[10px]">
          {FAQS.map((item, index) => (
            <div
              key={item.q}
              className="overflow-hidden rounded-xl border border-[#d9c8ad] bg-[#fff8ec] shadow-[0_3px_10px_rgba(146,104,56,0.05)]"
            >
              <button
                className={[
                  "flex min-h-[60px] w-full items-center justify-between gap-4 px-6 py-5 text-left text-[13.5px] font-semibold tracking-[0.01em] text-[#302115] transition-colors",
                  open === index ? "bg-[#f5e7d2]" : "hover:bg-[#f5e7d2]",
                ].join(" ")}
                aria-expanded={open === index}
                onClick={() => setOpen(open === index ? null : index)}
              >
                {item.q}
                <span
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[16px] leading-none text-[#a67126] transition-transform duration-200",
                    open === index ? "rotate-45 border-[#a67126]" : "border-[#d9c8ad]",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  +
                </span>
              </button>

              <div
                className={[
                  "overflow-hidden text-[13.5px] leading-[1.78] text-[#6c5641] transition-all duration-300 ease-in-out",
                  open === index ? "max-h-[320px] px-6 pb-[22px] pt-1" : "max-h-0 px-6",
                ].join(" ")}
                role="region"
              >
                {item.a}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
