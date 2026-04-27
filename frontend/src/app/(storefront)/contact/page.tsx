import type { Metadata } from "next";
import Link from "next/link";

import { getContactInfo } from "@/lib/api";

export const metadata: Metadata = {
  title: "Contact | DOMINATE",
  description: "Get in touch with DOMINATE for questions about products, orders, or partnerships.",
};

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const contact = await getContactInfo();
  const whatsappNumber = contact.whatsapp_number || "";
  const waLink = whatsappNumber ? `https://wa.me/${encodeURIComponent(whatsappNumber)}` : "#";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-6 shadow-[0_8px_24px_rgba(146,104,56,0.08)] md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9a7147]">Contact</p>
        <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.04em] text-[#3b2513] md:text-5xl">
          Get In Touch
        </h1>

        <p className="mt-6 text-base leading-7 text-[#6f5640]">{contact.tagline}</p>

        <div className="mt-8 rounded-xl border border-[#dcc9ab] bg-[#fffefb] p-5">
          <p className="text-sm uppercase tracking-[0.16em] text-[#8f673f]">WhatsApp Support</p>
          <p className="mt-2 text-xl font-semibold text-[#4f341f]">{whatsappNumber || "Not configured"}</p>
          <div className="mt-4">
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#c7ac84] bg-[#c89e65] px-5 py-2 text-sm font-semibold text-[#1d150e] hover:bg-[#ddb684]"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <Link href="/shipping" className="text-[#6f5640] hover:text-[#3b2513]">Shipping Policy</Link>
          <Link href="/returns" className="text-[#6f5640] hover:text-[#3b2513]">Return Policy</Link>
          <Link href="/terms" className="text-[#6f5640] hover:text-[#3b2513]">Terms</Link>
          <Link href="/privacy" className="text-[#6f5640] hover:text-[#3b2513]">Privacy</Link>
        </div>
      </div>
    </div>
  );
}
