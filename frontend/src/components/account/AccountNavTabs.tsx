"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getCurrentUser, logout, type CurrentUser } from "@/lib/api";

type AccountTab = "orders" | "addresses" | "profile";

type AccountNavTabsProps = {
  activeTab: AccountTab;
};

type TabItem = {
  label: string;
  href: string;
  icon: string;
  active?: boolean;
};

const BASE_ITEMS: TabItem[] = [
  {
    label: "Orders",
    href: "/account/orders",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  {
    label: "Addresses",
    href: "/account/addresses",
    icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    label: "Profile",
    href: "/account/profile",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
];

export default function AccountNavTabs({ activeTab }: AccountNavTabsProps) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then((data) => {
        if (isMounted) {
          setUser(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const navItems = useMemo(() => {
    return BASE_ITEMS.map((item) => ({
      ...item,
      active: item.href.endsWith(activeTab),
    }));
  }, [activeTab]);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      // Continue clearing UI route even if logout API fails.
    } finally {
      router.push("/");
      router.refresh();
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] transition-all ${
            item.active
              ? "border-[#a67126] bg-[#a67126]/10 text-[#a67126]"
              : "border-[#d9c8ad] bg-[#fffefb] text-[#6c5641] hover:border-[#a67126]/40 hover:text-[#302115]"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
          </svg>
          {item.label}
        </Link>
      ))}

      {user?.is_affiliate ? (
        <Link
          href="/affiliate/dashboard"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#d9c8ad] bg-[#fffefb] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6c5641] transition-all hover:border-[#a67126]/40 hover:text-[#302115]"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Affiliate
        </Link>
      ) : null}

      {user ? (
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#a94442]/40 bg-[#fff2f1] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#a94442] transition-all hover:bg-[#ffe8e7] disabled:opacity-60"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          {isLoggingOut ? "Logging Out" : "Logout"}
        </button>
      ) : null}
    </div>
  );
}
