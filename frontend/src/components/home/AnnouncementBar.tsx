import Link from "next/link";

export default function AnnouncementBar() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 bg-[#171411] px-5 py-[10px] text-center text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#d4943b]">
      <span>Free Shipping Above Rs. 799</span>
      <span className="hidden opacity-30 sm:inline">|</span>
      <span>New Athlete Bundle This Week</span>
      <span className="hidden opacity-30 sm:inline">|</span>
      <Link href="/products" className="border-b border-[#d4943b]/40 pb-px transition-opacity hover:opacity-80">
        Explore Collection -&gt;
      </Link>
    </div>
  );
}
