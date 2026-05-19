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
      { label: "Gym Partnerships", href: "/#gym-partners" },
      { label: "DOMINATE Gym", href: "/training" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Affiliates", href: "/affiliate/dashboard" },
    ],
  },
] as const;

const SOCIALS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/dominate.cali",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/917068462273",
    icon: (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-[#a67126]/10 bg-[#0d0b09] pb-7 pt-10 sm:pt-16">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        {/* Mobile: brand + socials compact, then link grid */}
        {/* Desktop: 4-col layout */}
        <div className="mb-10 sm:mb-14">
          {/* Brand row — always visible */}
          <div className="mb-8 flex items-center justify-between sm:mb-0 lg:hidden">
            <div>
              <Link href="/" className="inline-block">
                <p className="font-display text-[28px] tracking-[0.08em] text-[#f4eee4] sm:text-[32px]">Dominate</p>
              </Link>
              <p className="mt-1.5 max-w-[220px] text-[11px] leading-[1.7] text-[#f4eee4]/36 sm:max-w-[260px] sm:text-[12px]">
                D2C fitness gear from India for real athletes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#a67126]/16 text-[#f4eee4]/30 transition-all hover:border-[#a67126]/40 hover:bg-[#a67126]/10 hover:text-[#d4943b]"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns — 3-col on mobile, 4-col with brand on lg */}
          <div className="grid grid-cols-3 gap-6 sm:gap-8 lg:grid-cols-[1.8fr_1fr_1fr_1fr] lg:gap-12">
            {/* Brand column — desktop only */}
            <div className="hidden lg:block">
              <Link href="/" className="inline-block">
                <p className="font-display text-[32px] tracking-[0.08em] text-[#f4eee4]">Dominate</p>
              </Link>
              <p className="mb-6 mt-3 max-w-[260px] text-[12px] leading-[1.8] text-[#f4eee4]/36">
                Gear and accessories built for performance training. D2C from India for real athletes.
              </p>
              <div className="flex items-center gap-2">
                {SOCIALS.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#a67126]/16 text-[#f4eee4]/30 transition-all hover:border-[#a67126]/40 hover:bg-[#a67126]/10 hover:text-[#d4943b]"
                    aria-label={social.label}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {["India", "D2C Fitness", "Athlete-First"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#a67126]/12 px-3 py-[5px] text-[9px] font-semibold uppercase tracking-[0.16em] text-[#f4eee4]/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {COLS.map((col) => (
              <div key={col.title}>
                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[#d4943b] sm:mb-4">{col.title}</p>
                <ul className="flex list-none flex-col gap-2 sm:gap-[10px]">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="group flex items-center gap-1.5 text-[11px] text-[#f4eee4]/38 transition-colors hover:text-[#f4eee4] sm:text-[12px]"
                      >
                        {link.label}
                        <svg
                          className="hidden h-2.5 w-2.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 sm:block"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center gap-2 border-t border-[#a67126]/9 pt-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#f4eee4]/20 sm:text-[9.5px]">
            &copy; 2026 Dominate. All rights reserved.
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#a67126]/30 sm:text-[9.5px]">
            Made for Athletes. Built to Dominate.
          </span>
        </div>
      </div>
    </footer>
  );
}
