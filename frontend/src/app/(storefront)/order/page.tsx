import Link from "next/link";

export default function LegacyOrderLandingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] px-6 py-12 text-center shadow-[0_8px_24px_rgba(146,104,56,0.08)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9a7147]">Legacy Compatibility</p>
        <h1 className="text-brand-display mt-2 text-5xl uppercase tracking-[0.05em] text-[#3b2513]">Place An Order</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-[#6f5640]">
          The direct legacy order page has been migrated into product-specific order flows.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/products"
            className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684]"
          >
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  );
}
