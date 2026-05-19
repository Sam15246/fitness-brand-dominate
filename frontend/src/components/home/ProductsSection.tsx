import Link from "next/link";

import AppImage from "@/components/ui/AppImage";
import { fetchProducts } from "@/features/products";

type HomeCard = {
  href: string;
  tag: string;
  name: string;
  desc: string;
  price_display: string;
  listing_price_display?: string;
  image: string;
  cta: string;
};

const FALLBACK_PRODUCTS: HomeCard[] = [
  {
    href: "/products?q=chalk",
    tag: "Grip and Training",
    name: "Liquid Chalk",
    desc: "Premium liquid chalk for cleaner grip and better control during intense training.",
    price_display: "Rs. 300",
    listing_price_display: "From ₹250.00",
    image: "/liquid-chalk-dominate200ml.png",
    cta: "Shop Now",
  },
  {
    href: "/products?q=parallettes",
    tag: "Coming Soon",
    name: "Wooden Parallettes",
    desc: "Stable wooden parallettes built for handstands, dips, L-sits, and progression work.",
    price_display: "Coming Soon",
    image: "/dominate-parallettes-standard.png",
    cta: "Learn More",
  },
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function matchesLiquidChalk(name: string, slug: string): boolean {
  const n = normalize(name);
  const s = normalize(slug);
  return n.includes("liquid chalk") || (s.includes("liquid") && s.includes("chalk"));
}

function matchesParallettes(name: string, slug: string): boolean {
  const n = normalize(name);
  const s = normalize(slug);
  return n.includes("parallet") || s.includes("parallet");
}

export default async function ProductsSection() {
  let items: Awaited<ReturnType<typeof fetchProducts>>["items"] = [];

  try {
    const response = await fetchProducts({ page: 1, perPage: 24 });
    items = response.items;
  } catch {
    items = [];
  }

  const liquidChalkItem = items.find((item) => matchesLiquidChalk(item.name, item.slug));
  const parallettesItem = items.find((item) => matchesParallettes(item.name, item.slug));

  const cards: HomeCard[] = [
    {
      ...FALLBACK_PRODUCTS[0],
      ...(liquidChalkItem
        ? {
            href: `/products/${liquidChalkItem.slug}`,
            tag: liquidChalkItem.in_stock ? "In Stock" : "Out of Stock",
            name: liquidChalkItem.name,
            desc: liquidChalkItem.description,
            price_display: liquidChalkItem.price_display,
            cta: "View Product",
          }
        : {}),
    },
    {
      ...FALLBACK_PRODUCTS[1],
      ...(parallettesItem
        ? {
            href: `/products/${parallettesItem.slug}`,
            tag: parallettesItem.is_coming_soon ? "Coming Soon" : parallettesItem.in_stock ? "In Stock" : "Out of Stock",
            name: parallettesItem.name,
            desc: parallettesItem.description,
            price_display: parallettesItem.is_coming_soon ? "Coming Soon" : parallettesItem.price_display,
            cta: parallettesItem.is_coming_soon ? "Learn More" : "View Product",
          }
        : {}),
    },
  ];

  return (
    <section id="products" className="bg-[#fff8ec] py-12 sm:py-16 md:py-24">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="mb-6 sm:mb-10 md:mb-14 flex flex-col sm:flex-row sm:flex-wrap sm:items-end sm:justify-between gap-3 sm:gap-4 md:gap-6">
          <div>
            <p className="mb-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">The Collection</p>
            <h2 className="font-display text-[28px] sm:text-[40px] lg:text-[52px] uppercase leading-none tracking-[0.04em] text-[#302115]">
              Built to Perform
            </h2>
          </div>
          <Link
            href="/products"
            className="group flex items-center gap-2 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.18em] text-[#a67126] transition-colors hover:text-[#302115]"
          >
            View all
            <svg className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:gap-6 lg:gap-7">
          {cards.map((card) => (
            <Link
              key={card.name}
              href={card.href}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] shadow-[0_6px_24px_rgba(146,104,56,0.07)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_56px_rgba(146,104,56,0.16)]"
            >
              {/* Image with zoom-on-hover */}
              <div className="relative overflow-hidden bg-[#f5e7d2]">
                <AppImage
                  src={card.image}
                  alt={card.name}
                  width={800}
                  height={450}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="aspect-[16/9] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 md:aspect-[16/10]"
                />
                {/* Hover overlay with CTA */}
                <div className="absolute inset-0 flex items-center justify-center bg-[#1e1710]/0 transition-colors duration-300 group-hover:bg-[#1e1710]/20">
                  <span className="translate-y-4 rounded-full bg-[#f4eee4] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#302115] opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    {card.cta}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-4 sm:p-5 md:p-8 md:pb-9">
                <span className="mb-2 sm:mb-3 inline-block self-start rounded-full border border-[#a67126]/18 bg-[#a67126]/8 px-2.5 py-[4px] text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] text-[#a67126]">
                  {card.tag}
                </span>
                <h3 className="mb-2 sm:mb-2.5 font-display text-[22px] sm:text-[28px] md:text-[38px] uppercase leading-none tracking-[0.03em] text-[#302115]">
                  {card.name}
                </h3>
                {/* Static 5-star rating for social proof */}
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[14px] text-[#d4943b]">★★★★★</span>
                  <span className="text-[13px] font-semibold text-[#302115]">4.9</span>
                </div>

                <p className="mb-4 sm:mb-6 flex-1 text-[14px] leading-[1.6] sm:text-[13px] sm:leading-[1.75] text-[#6c5641]">
                  {card.name.toLowerCase().includes("liquid chalk")
                    ? "200ml. Strong grip. Zero slip. No chalk dust."
                    : card.name.toLowerCase().includes("parallet") || card.name.toLowerCase().includes("parallettes")
                    ? "Solid hardwood. Stable base. Built for dips, L-sits, handstands."
                    : card.desc.length > 120
                    ? `${card.desc.slice(0, 120).trim()}...`
                    : card.desc}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                  <span className="font-display text-[22px] sm:text-[28px] tracking-[0.03em] text-[#302115]">{card.listing_price_display || card.price_display}</span>
                  <span className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#a67126]/22 bg-[#1e1710] px-6 py-3 text-[14px] font-bold uppercase tracking-[0.14em] text-[#f4eee4] transition-all duration-300 group-hover:bg-[#a67126] group-hover:shadow-[0_4px_16px_rgba(166,113,38,0.3)] sm:w-auto">
                    {card.cta}
                    <svg className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
