import Link from "next/link";

import { getContactInfo } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const contact = await getContactInfo();
  const whatsappNumber = contact.whatsapp_number || "";
  const waLink = whatsappNumber ? `https://wa.me/${encodeURIComponent(whatsappNumber)}` : "#";

  return (
    <div className="min-h-screen bg-[#0d0b09] px-6 py-12 text-[#f4eee4]">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-[#8b6f47]/30 bg-[#15120f]/90 p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#b59a73]">Contact</p>
        <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.04em] text-[#f1ddbe] md:text-5xl">
          Get In Touch
        </h1>

        <p className="mt-6 text-base leading-7 text-[#d8c8af]">{contact.tagline}</p>

        <div className="mt-8 rounded-xl border border-[#8b6f47]/35 bg-[#1a1510] p-5">
          <p className="text-sm uppercase tracking-[0.16em] text-[#b59a73]">WhatsApp Support</p>
          <p className="mt-2 text-xl font-semibold text-[#f1ddbe]">{whatsappNumber || "Not configured"}</p>
          <div className="mt-4">
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#9f8157] bg-[#8b6f47] px-5 py-2 text-sm font-semibold text-[#17110c] hover:bg-[#a1845d]"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <Link href="/shipping" className="text-[#d8c8af] hover:text-[#f1ddbe]">Shipping Policy</Link>
          <Link href="/returns" className="text-[#d8c8af] hover:text-[#f1ddbe]">Return Policy</Link>
          <Link href="/terms" className="text-[#d8c8af] hover:text-[#f1ddbe]">Terms</Link>
          <Link href="/privacy" className="text-[#d8c8af] hover:text-[#f1ddbe]">Privacy</Link>
        </div>
      </div>
    </div>
  );
}
