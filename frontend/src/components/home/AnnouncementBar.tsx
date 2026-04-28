import Link from "next/link";

export default function AnnouncementBar() {
  return (
    <div className="relative overflow-hidden bg-[#171411]">
      {/* Subtle shimmer effect */}
      <div
        className="pointer-events-none absolute inset-0 bg-[length:200%_100%] animate-[shimmer_8s_ease-in-out_infinite] opacity-30"
        style={{ backgroundImage: "linear-gradient(90deg, transparent 0%, rgba(166,113,38,0.08) 50%, transparent 100%)" }}
        aria-hidden="true"
      />
      <div className="relative flex flex-wrap items-center justify-center gap-4 px-5 py-[10px] text-center text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#d4943b]">
        <span className="flex items-center gap-2">
          <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Free Shipping Above Rs. 799
        </span>
        <span className="hidden opacity-20 sm:inline">&bull;</span>
        <span>New Athlete Bundle This Week</span>
        <span className="hidden opacity-20 sm:inline">&bull;</span>
        <Link href="/products" className="group flex items-center gap-1 border-b border-[#d4943b]/30 pb-px transition-all hover:border-[#d4943b]/60">
          Explore Collection
          <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
