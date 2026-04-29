"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getCurrentUser, logout, type CurrentUser } from "@/lib/api";

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (loading) {
    return (
      <div className="h-10 w-10 animate-pulse rounded-full bg-[#a67126]/20" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex min-h-[44px] items-center rounded-full border border-[#c89e65]/35 bg-[#a67126] px-[14px] py-2 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#f4eee4] transition-colors hover:bg-[#b97e2e]"
      >
        Sign In
      </Link>
    );
  }

  const isAdmin = ["admin", "superadmin"].includes(user.role?.toLowerCase() || "");
  const initials = (user.name || user.email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#a67126] text-[11px] font-bold tracking-wider text-[#f4eee4] transition-colors hover:bg-[#b97e2e]"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {initials}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[#dcc9ab] bg-[#fffaf2] shadow-[0_12px_40px_rgba(146,104,56,0.15)]">
          {/* User info */}
          <div className="border-b border-[#e8d5b8] px-4 py-3">
            <p className="text-sm font-semibold text-[#3b2513]">{user.name || "User"}</p>
            <p className="mt-0.5 text-xs text-[#6f5640]">{user.email}</p>
            {isAdmin ? (
              <span className="mt-1.5 inline-block rounded-full border border-[#c89e65]/40 bg-[#fff2dd] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#8b5e34]">
                {user.role}
              </span>
            ) : null}
          </div>

          {/* Navigation */}
          <div className="py-1">
            <MenuLink href="/account/orders" label="My Orders" onClick={() => setOpen(false)} />
            <MenuLink href="/account/profile" label="My Profile" onClick={() => setOpen(false)} />
            <MenuLink href="/account/addresses" label="Addresses" onClick={() => setOpen(false)} />
          </div>

          {/* Affiliate section */}
          {user.is_affiliate ? (
            <div className="border-t border-[#e8d5b8] py-1">
              <MenuLink href="/affiliate/dashboard" label="Affiliate Dashboard" onClick={() => setOpen(false)} />
            </div>
          ) : null}

          {/* Admin section */}
          {isAdmin ? (
            <div className="border-t border-[#e8d5b8] py-1">
              <p className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#9a7147]">Admin</p>
              <MenuLink href="/admin/dashboard" label="Admin Dashboard" onClick={() => setOpen(false)} />
            </div>
          ) : null}

          {/* Logout */}
          <div className="border-t border-[#e8d5b8] py-1">
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                try {
                  await logout();
                } catch {
                  // proceed even if logout API fails
                }
                router.push("/");
                router.refresh();
              }}
              className="w-full px-4 py-3 text-left text-sm text-[#a94442] transition-colors hover:bg-[#fff0eb]"
            >
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-3 text-sm text-[#4f3825] transition-colors hover:bg-[#f7e6c8]"
    >
      {label}
    </Link>
  );
}
