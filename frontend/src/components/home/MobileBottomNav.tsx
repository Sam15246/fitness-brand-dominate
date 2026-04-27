import Link from "next/link";

export default function MobileBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-3 gap-1.5 border-t border-[#a67126]/14 bg-[#0d0b09]/97 px-4 pb-3 pt-2 backdrop-blur-md md:hidden"
      aria-label="Mobile navigation"
    >
      <Link
        href="/products"
        className="flex min-h-[52px] flex-col items-center justify-center gap-[3px] rounded-[10px] px-1 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[#f4eee4]/55 transition-colors hover:bg-[#a67126]/14 hover:text-[#f4eee4]"
      >
        <span className="text-[11px]">Shop</span>
      </Link>
      <Link
        href="/order/status"
        className="flex min-h-[52px] flex-col items-center justify-center gap-[3px] rounded-[10px] px-1 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[#f4eee4]/55 transition-colors hover:bg-[#a67126]/14 hover:text-[#f4eee4]"
      >
        <span className="text-[11px]">Track</span>
      </Link>
      <Link
        href="/auth/login"
        className="flex min-h-[52px] flex-col items-center justify-center gap-[3px] rounded-[10px] px-1 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[#f4eee4]/55 transition-colors hover:bg-[#a67126]/14 hover:text-[#f4eee4]"
      >
        <span className="text-[11px]">Sign In</span>
      </Link>
    </nav>
  );
}
