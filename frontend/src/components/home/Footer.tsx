import Link from "next/link";

const COLS = [
  {
    title: "Shop",
    links: [
      { label: "All Products", href: "/products" },
      { label: "Liquid Chalk", href: "/products?q=chalk" },
      { label: "Parallettes", href: "/products?q=parallettes" },
      { label: "Cart", href: "/cart" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Track Order", href: "/order/status" },
      { label: "Shipping", href: "/shipping" },
      { label: "Returns", href: "/returns" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Affiliates", href: "/affiliate/dashboard" },
    ],
  },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-[#a67126]/10 bg-[#171411] pb-7 pt-16">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="mb-14 grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-[1.8fr_1fr_1fr_1fr] lg:gap-12">
          <div>
            <p className="mb-3 font-display text-[28px] tracking-[0.08em] text-[#f4eee4]">Dominate</p>
            <p className="mb-5 max-w-[260px] text-[12px] leading-[1.8] text-[#f4eee4]/36">
              Gear and accessories built for performance training. D2C from India for real athletes.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["India", "D2C Fitness", "Athlete-First"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#a67126]/16 px-3 py-[5px] text-[9px] font-semibold uppercase tracking-[0.16em] text-[#f4eee4]/28"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#d4943b]">{col.title}</p>
              <ul className="flex list-none flex-col gap-[10px]">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-[12px] text-[#f4eee4]/38 transition-colors hover:text-[#f4eee4]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#a67126]/09 pt-5">
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-[#f4eee4]/20">
            Copyright 2026 Dominate. All rights reserved.
          </span>
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-[#a67126]/40">
            Made for Athletes. Built to Dominate.
          </span>
        </div>
      </div>
    </footer>
  );
}
