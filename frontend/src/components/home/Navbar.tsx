"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AppImage from "@/components/ui/AppImage";
import UserMenu from "@/components/home/UserMenu";
import { getCart } from "@/lib/api";

const NAV_LINKS = [
  { label: "Shop", href: "/products" },
  { label: "How It Works", href: "/#how" },
  { label: "About", href: "/#why" },
  { label: "FAQ", href: "/#faq" },
] as const;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // Scroll-aware background
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cart count — refresh on mount and whenever a "cart-updated" event fires
  useEffect(() => {
    function refresh() {
      getCart()
        .then((cart) => setCartCount(cart.count))
        .catch(() => setCartCount(0));
    }
    refresh();
    window.addEventListener("cart-updated", refresh);
    return () => window.removeEventListener("cart-updated", refresh);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <nav
        className={[
          "sticky top-0 z-50 border-b transition-all duration-300",
          scrolled
            ? "border-[#a67126]/20 bg-[#0d0b09]/98 shadow-[0_2px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl"
            : "border-[#a67126]/8 bg-[#0d0b09]/80 backdrop-blur-md",
        ].join(" ")}
      >
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5 sm:px-8 md:h-[70px] lg:px-10">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-[10px]">
            <AppImage
              src="/logo.png"
              alt="Dominate"
              width={34}
              height={34}
              className="h-[34px] w-[34px] object-contain transition-transform duration-300 group-hover:scale-105"
              sizes="34px"
            />
            <span className="font-display text-[22px] tracking-[0.1em] text-[#f4eee4] md:text-[25px]">Dominate</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            <ul className="flex list-none items-center gap-0.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group relative inline-flex min-h-[44px] items-center rounded-full px-[14px] py-2 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#f4eee4]/60 transition-colors hover:text-[#f4eee4]"
                  >
                    {link.label}
                    <span className="absolute bottom-[10px] left-1/2 h-px w-0 -translate-x-1/2 bg-[#c89e65] transition-all duration-300 group-hover:w-[calc(100%-28px)]" />
                  </Link>
                </li>
              ))}
            </ul>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-[#f4eee4]/60 transition-colors hover:bg-[#a67126]/12 hover:text-[#f4eee4]"
              aria-label="Cart"
            >
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#c89e65] px-1 text-[9px] font-bold text-[#0d0b09]">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>

            <div className="ml-1.5">
              <UserMenu />
            </div>
          </div>

          {/* Mobile right side */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Mobile cart */}
            <Link
              href="/cart"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#f4eee4]/60"
              aria-label="Cart"
            >
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute right-0 top-0 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#c89e65] px-0.5 text-[8px] font-bold text-[#0d0b09]">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
            <UserMenu />
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#a67126]/25 text-[#f4eee4]/70"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile fullscreen overlay */}
      {open && (
        <div className="fixed inset-0 z-[300] bg-[#090705]" role="dialog" aria-modal="true">
          {/* Decorative watermark */}
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none font-display text-[clamp(120px,30vw,200px)] uppercase tracking-[0.06em] text-[#a67126]/[0.04]"
            aria-hidden="true"
          >
            DOMINATE
          </span>

          <div className="relative flex h-full flex-col">
            {/* Close bar */}
            <div className="flex h-16 items-center justify-between px-5">
              <span className="font-display text-[22px] tracking-[0.1em] text-[#f4eee4]">Dominate</span>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#a67126]/25 text-[#f4eee4]/70"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nav links */}
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              {NAV_LINKS.map((link, i) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-center gap-4 py-2"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className="text-[11px] font-bold tracking-[0.2em] text-[#a67126]/30 transition-colors group-hover:text-[#c89e65]">
                    0{i + 1}
                  </span>
                  <span className="font-display text-[clamp(42px,12vw,64px)] uppercase leading-none tracking-[0.04em] text-[#f4eee4] transition-colors group-hover:text-[#d4943b]">
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>

            {/* Bottom bar */}
            <div className="flex items-center justify-between border-t border-[#a67126]/10 px-5 py-4">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#f4eee4]/20">Train Anywhere. Dominate Everywhere.</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
