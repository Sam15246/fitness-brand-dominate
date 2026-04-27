"use client";

import Link from "next/link";
import { useState } from "react";

import AppImage from "@/components/ui/AppImage";
import UserMenu from "@/components/home/UserMenu";

const NAV_LINKS = [
  { label: "Shop", href: "/products" },
  { label: "How It Works", href: "/#how" },
  { label: "About", href: "/#why" },
  { label: "FAQ", href: "/#faq" },
] as const;

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-[#a67126]/15 bg-[#0d0b09]/97 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5 sm:px-8 md:h-[70px] lg:px-10">
          <Link href="/" className="flex items-center gap-[10px]">
            <AppImage
              src="/logo.png"
              alt="Dominate"
              width={34}
              height={34}
              className="h-[34px] w-auto object-contain"
              sizes="34px"
            />
            <span className="font-display text-[22px] tracking-[0.1em] text-[#f4eee4] md:text-[25px]">Dominate</span>
          </Link>

          <div className="hidden items-center gap-0.5 md:flex">
            <ul className="flex list-none items-center gap-0.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-[44px] items-center rounded-full px-[14px] py-2 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#f4eee4]/60 transition-colors hover:bg-[#a67126]/16 hover:text-[#f4eee4]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="ml-2">
              <UserMenu />
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <UserMenu />
            <button
              className="h-10 min-w-[44px] rounded-lg border border-[#a67126]/32 px-[14px] text-[10px] font-bold uppercase tracking-[0.13em] text-[#f4eee4]"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              Menu
            </button>
          </div>
        </div>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-6 bg-[#090705]/98" role="dialog" aria-modal="true">
          <button
            className="absolute right-5 top-5 h-11 min-w-[44px] rounded-lg border border-[#a67126]/30 px-4 text-[10px] font-bold uppercase tracking-[0.13em] text-[#f4eee4]"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            Close
          </button>

          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex min-h-[56px] items-center font-display text-[48px] uppercase tracking-[0.06em] text-[#f4eee4] transition-colors hover:text-[#d4943b]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
