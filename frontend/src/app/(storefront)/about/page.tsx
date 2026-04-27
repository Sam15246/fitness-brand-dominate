import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | DOMINATE",
  description: "DOMINATE builds functional strength equipment for athletes who train with intent.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-6 shadow-[0_8px_24px_rgba(146,104,56,0.08)] md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9a7147]">About</p>
        <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.04em] text-[#3b2513] md:text-5xl">
          DOMINATE
        </h1>

        <p className="mt-6 text-base leading-7 text-[#6f5640]">
          DOMINATE builds functional strength equipment for athletes who train with intent. Our focus is
          durable craftsmanship, practical design, and performance-first training tools.
        </p>

        <p className="mt-4 text-base leading-7 text-[#6f5640]">
          Whether you train at home, in a studio, or outdoors, our mission is the same: help you train
          anywhere and dominate everywhere.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/products"
            className="rounded-full border border-[#c7ac84] bg-[#c89e65] px-5 py-2 text-sm font-semibold text-[#1d150e] hover:bg-[#ddb684]"
          >
            Shop Products
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-[#c7ac84] px-5 py-2 text-sm font-semibold text-[#7e5935] hover:bg-[#f7e6c8]"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
