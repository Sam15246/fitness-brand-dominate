"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AppImage from "@/components/ui/AppImage";
import UserMenu from "@/components/home/UserMenu";
import { getCart } from "@/lib/api";
import { getLocalCart } from "@/lib/local-cart";

const NAV_LINKS = [
  { label: "Shop", href: "/products" },
  { label: "For Gyms", href: "/#gym-partners" },
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
        .catch(() => {
          // Backend unreachable — read from localStorage
          setCartCount(getLocalCart().count);
        });
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
              className="relative inline-flex h-12 w-12 items-center justify-center rounded-full text-[#f4eee4]/60"
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
            <button
              className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#a67126]/25 text-[#f4eee4]/70"
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

      {/* Mobile drawer + backdrop */}
      {open && (
        <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true">
          <button
            className="absolute inset-0 bg-[#090705]/65 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
            aria-label="Close menu backdrop"
          />

          <div className="absolute right-0 top-0 h-full w-[min(86vw,360px)] animate-[slideInFromRight_220ms_ease-out] border-l border-[#a67126]/20 bg-[#0d0b09] shadow-[-12px_0_40px_rgba(0,0,0,0.4)]">
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center justify-between border-b border-[#a67126]/14 px-5 pt-[max(env(safe-area-inset-top,0px),0px)]">
                <span className="font-display text-[22px] tracking-[0.1em] text-[#f4eee4]">Menu</span>
                <button
                  className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#a67126]/25 text-[#f4eee4]/70"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-1 flex-col px-5 py-4">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-12 items-center border-b border-[#a67126]/10 text-[14px] font-semibold uppercase tracking-[0.1em] text-[#f4eee4]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="border-t border-[#a67126]/10 px-5 py-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#f4eee4]/30">Train Anywhere. Dominate Everywhere.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
