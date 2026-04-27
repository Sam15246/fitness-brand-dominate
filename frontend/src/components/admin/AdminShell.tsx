"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/admin/orders", label: "Orders", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
      { href: "/admin/products", label: "Products", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
      { href: "/admin/coupons", label: "Coupons", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/users", label: "Users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" },
      { href: "/admin/affiliates", label: "Affiliates", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
      { href: "/admin/commissions", label: "Commissions", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/reviews", label: "Reviews", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
      { href: "/admin/policies", label: "Policies", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    ],
  },
] as const;

type AdminShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

export default function AdminShell({ title, subtitle, children, actions }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#0d0b09]">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-[#8b6f47]/15 bg-[#110e0b] lg:block">
        <div className="sticky top-0 flex h-full flex-col overflow-y-auto py-6">
          <Link href="/admin/dashboard" className="mb-6 px-5">
            <span className="font-display text-xl tracking-[0.1em] text-[#c89e65]">DOMINATE</span>
            <span className="ml-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8b6f47]">Admin</span>
          </Link>

          <nav className="flex-1 space-y-5 px-3">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <p className="mb-1.5 px-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#8b6f47]/60">
                  {section.label}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium transition-colors ${
                            isActive
                              ? "bg-[#c89e65]/15 text-[#f2dfc0]"
                              : "text-[#d8c19a]/60 hover:bg-[#8b6f47]/10 hover:text-[#d8c19a]"
                          }`}
                        >
                          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                          </svg>
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="mt-auto border-t border-[#8b6f47]/15 px-3 pt-4">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] text-[#d8c19a]/40 transition-colors hover:text-[#d8c19a]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Store
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden">
        {/* Mobile nav */}
        <div className="border-b border-[#8b6f47]/15 bg-[#110e0b] px-4 py-2 lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/admin/dashboard" className="font-display text-lg tracking-[0.1em] text-[#c89e65]">
              ADMIN
            </Link>
            <Link href="/" className="text-[10px] uppercase tracking-wider text-[#8b6f47]">Store</Link>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 pb-1">
            {NAV_SECTIONS.flatMap((s) => s.items).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    isActive
                      ? "bg-[#c89e65]/20 text-[#f2dfc0]"
                      : "text-[#d8c19a]/50 hover:text-[#d8c19a]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Page header */}
        <div className="border-b border-[#8b6f47]/10 bg-[#0d0b09] px-6 py-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-brand-display text-3xl uppercase tracking-[0.05em] text-[#f2dfc0] lg:text-4xl">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-[#d8c19a]/70">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </div>

        {/* Page body */}
        <div className="px-6 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
