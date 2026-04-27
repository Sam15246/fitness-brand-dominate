const BADGES = [
  { icon: "FD", title: "Fast Dispatch", detail: "Packed within 24 hrs on business days" },
  { icon: "SC", title: "Secure Checkout", detail: "Protected payments, confirmed orders" },
  { icon: "WS", title: "WhatsApp Support", detail: "Track and resolve queries instantly" },
  { icon: "PT", title: "Performance Tested", detail: "Built for real training and durability" },
] as const;

export default function TrustStrip() {
  return (
    <div className="border-t border-[#a67126]/10 bg-[#1e1710]">
      <div className="mx-auto grid max-w-[1240px] grid-cols-2 lg:grid-cols-4">
        {BADGES.map((badge, index) => (
          <div
            key={badge.title}
            className={[
              "flex items-start gap-3 border-b border-[#a67126]/08 px-5 py-[18px] md:px-[26px] md:py-[22px]",
              index % 2 === 0 ? "border-r border-[#a67126]/08" : "",
              "lg:border-b-0 lg:border-r lg:border-[#a67126]/08 lg:last:border-r-0",
            ].join(" ")}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#a67126]/12 text-[11px] font-bold text-[#f4eee4]">
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
