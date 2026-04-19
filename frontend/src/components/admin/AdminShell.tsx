import Link from "next/link";

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/policies", label: "Policies" },
  { href: "/admin/affiliates", label: "Affiliates" },
  { href: "/admin/commissions", label: "Commissions" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/image-guidelines", label: "Image Guidelines" },
];

type AdminShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export default function AdminShell({ title, subtitle, children }: AdminShellProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-[#b59a73]">Admin Panel</p>
        <h1 className="text-brand-display text-4xl uppercase tracking-[0.05em] text-[#f2dfc0]">{title}</h1>
        {subtitle ? <p className="text-sm text-[#d8c19a]">{subtitle}</p> : null}
      </div>

      <div className="mb-8 grid gap-2 rounded-xl border border-[#8b6f47]/35 bg-[#15110d] p-3 md:grid-cols-5">
        {adminLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-[#8b6f47]/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#d8c19a] hover:bg-[#8b6f47] hover:text-[#1d150e]"
          >
            {item.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}
