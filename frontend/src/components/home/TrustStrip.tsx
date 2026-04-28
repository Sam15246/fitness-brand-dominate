const BADGES = [
  {
    title: "Fast Dispatch",
    detail: "Packed within 24 hrs on business days",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Secure Checkout",
    detail: "Protected payments, confirmed orders",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "WhatsApp Support",
    detail: "Track and resolve queries instantly",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    title: "Performance Tested",
    detail: "Built for real training and durability",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
] as const;

export default function TrustStrip() {
  return (
    <div className="border-t border-[#a67126]/10 bg-[#1e1710]">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {BADGES.map((badge, index) => (
          <div
            key={badge.title}
            className={[
              "group flex items-start gap-3.5 px-5 py-4 transition-colors hover:bg-[#a67126]/[0.06] sm:py-[20px] md:px-[26px] md:py-[24px]",
              index < BADGES.length - 1 ? "border-b border-[#a67126]/[0.08] sm:border-b-0" : "",
              index % 2 === 0 ? "sm:border-r sm:border-[#a67126]/[0.08]" : "",
              index < 2 ? "sm:border-b sm:border-[#a67126]/[0.08] lg:border-b-0" : "",
              index < BADGES.length - 1 ? "lg:border-r lg:border-[#a67126]/[0.08]" : "",
            ].join(" ")}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#a67126]/10 text-[#d4943b] transition-colors group-hover:bg-[#a67126]/18">
              {badge.icon}
            </div>
            <div>
              <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#f4eee4]">{badge.title}</p>
              <p className="text-[11px] leading-[1.5] text-[#f4eee4]/36">{badge.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
