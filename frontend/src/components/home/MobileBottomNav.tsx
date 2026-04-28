"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { getCart, getCurrentUser, type CurrentUser } from "@/lib/api";

type Tab = {
  label: string;
  href: string;
  hrefGuest?: string;
  icon: React.ReactNode;
  showBadge?: boolean;
  authAware?: boolean;
};

const TABS: Tab[] = [
  {
    label: "Shop",
    href: "/products",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: "Cart",
    href: "/cart",
    showBadge: true,
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    label: "Track",
    href: "/order/status",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    label: "Account",
    href: "/account/profile",
    hrefGuest: "/auth/login",
    authAware: true,
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    function refresh() {
      getCart().then((c) => setCartCount(c.count)).catch(() => setCartCount(0));
    }
    refresh();
    window.addEventListener("cart-updated", refresh);
    return () => window.removeEventListener("cart-updated", refresh);
  }, []);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#a67126]/14 bg-[#0d0b09]/97 px-2 pb-[max(env(safe-area-inset-bottom,0px),8px)] pt-1.5 backdrop-blur-xl md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-4 gap-1">
        {TABS.map((tab) => {
          const href = tab.authAware && !user ? (tab.hrefGuest ?? "/auth/login") : tab.href;
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");

          return (
            <Link
              key={tab.label}
              href={href}
              className={[
                "relative flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors",
                isActive
                  ? "bg-[#a67126]/14 text-[#d4943b]"
                  : "text-[#f4eee4]/40 hover:text-[#f4eee4]/70",
              ].join(" ")}
            >
              <span className="relative">
                {tab.icon}
                {tab.showBadge && cartCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[#c89e65] px-0.5 text-[7px] font-bold text-[#0d0b09]">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.1em]">
                {tab.authAware ? (user ? "Account" : "Sign In") : tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
