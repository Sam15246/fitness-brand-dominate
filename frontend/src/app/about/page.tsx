import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0d0b09] px-6 py-12 text-[#f4eee4]">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-[#8b6f47]/30 bg-[#15120f]/90 p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#b59a73]">About</p>
        <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.04em] text-[#f1ddbe] md:text-5xl">
          DOMINATE
        </h1>

        <p className="mt-6 text-base leading-7 text-[#d8c8af]">
          DOMINATE builds functional strength equipment for athletes who train with intent. Our focus is
          durable craftsmanship, practical design, and performance-first training tools.
        </p>

        <p className="mt-4 text-base leading-7 text-[#d8c8af]">
          Whether you train at home, in a studio, or outdoors, our mission is the same: help you train
          anywhere and dominate everywhere.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/products"
            className="rounded-full border border-[#9f8157] bg-[#8b6f47] px-5 py-2 text-sm font-semibold text-[#17110c] hover:bg-[#a1845d]"
          >
            Shop Products
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-[#9f8157] px-5 py-2 text-sm font-semibold text-[#f1ddbe] hover:bg-[#8b6f47] hover:text-[#17110c]"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
