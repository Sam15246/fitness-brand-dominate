import Link from "next/link";

export default function LegacyOrderLandingPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[#b59a73]">Legacy Compatibility</p>
      <h1 className="text-brand-display mt-2 text-5xl uppercase tracking-[0.05em] text-[#f2dfc0]">Place An Order</h1>
      <p className="mx-auto mt-4 max-w-xl text-sm text-[#d8c19a]">
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
  );
}
