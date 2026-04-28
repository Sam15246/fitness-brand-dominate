import type { Metadata } from "next";
import Link from "next/link";

import { getContactInfo } from "@/lib/api";

export const metadata: Metadata = {
  title: "Contact | DOMINATE",
  description: "Get in touch with DOMINATE for questions about products, orders, or partnerships.",
};

export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  { label: "Shipping Policy", href: "/shipping", icon: "M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l4-2 4 2 4-2 4 2V6a1 1 0 00-1-1h-2" },
  { label: "Return Policy", href: "/returns", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
  { label: "Terms & Conditions", href: "/terms", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { label: "Privacy Policy", href: "/privacy", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
];

const SUPPORT_TOPICS = [
  { icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", label: "Order Tracking" },
  { icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01", label: "Product Info & Sizing" },
  { icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", label: "Returns & Exchanges" },
  { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", label: "Bulk & Partnerships" },
];

export default async function ContactPage() {
  let contact;
  try {
    contact = await getContactInfo();
  } catch {
    contact = { whatsapp_number: "917068462273", tagline: "" };
  }
  const whatsappNumber = contact.whatsapp_number || "917068462273";
  const waLink = `https://wa.me/${encodeURIComponent(whatsappNumber)}`;

  return (
    <div className="min-h-screen bg-[#fff8ec]">
      {/* ── Dark Hero Header ── */}
      <div className="relative overflow-hidden bg-[#0d0b09]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(166,113,38,0.12)_0%,transparent_70%)]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative mx-auto max-w-[900px] px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">Contact</p>
          <h1 className="mt-3 font-display text-[clamp(32px,6vw,52px)] uppercase leading-[0.92] tracking-[0.04em] text-[#f4eee4]">
            Get In Touch
          </h1>
          <p className="mt-4 max-w-[480px] text-[14px] leading-[1.8] text-[#8a7a66]">
            {contact.tagline || "Have questions about products, orders, or partnerships? We\u2019d love to hear from you."}
          </p>
        </div>
        {/* Watermark */}
        <div className="pointer-events-none absolute -bottom-6 -right-2 select-none font-display text-[140px] uppercase leading-none tracking-[0.04em] text-[#f4eee4]/[0.02] sm:text-[200px]">
          ?
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="mx-auto max-w-[900px] px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
        <div className="grid gap-6 md:grid-cols-2">
          {/* WhatsApp card */}
          <div className="group rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-6 transition-all hover:-translate-y-0.5 hover:border-[#4a7c3f]/30 hover:shadow-[0_8px_24px_rgba(74,124,63,0.08)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#4a7c3f]/10 transition-colors group-hover:bg-[#4a7c3f]/15">
              <svg className="h-6 w-6 text-[#4a7c3f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a67126]">WhatsApp Support</p>
            <p className="mt-2 font-display text-[24px] tracking-[0.02em] text-[#302115]">
              {whatsappNumber || "Not configured"}
            </p>
            <p className="mt-2 text-[12px] leading-[1.6] text-[#6c5641]">
              Chat with us for order help, product questions, or any support you need. We typically reply within minutes.
            </p>
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="group/btn relative mt-5 inline-flex overflow-hidden rounded-full bg-[#4a7c3f] px-6 py-[13px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:shadow-[0_4px_20px_rgba(74,124,63,0.3)]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
              <span className="relative flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat on WhatsApp
              </span>
            </a>
          </div>

          {/* Response time card */}
          <div className="group rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-6 transition-all hover:-translate-y-0.5 hover:border-[#a67126]/30 hover:shadow-[0_8px_24px_rgba(146,104,56,0.08)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#a67126]/10 transition-colors group-hover:bg-[#a67126]/15">
              <svg className="h-6 w-6 text-[#a67126]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a67126]">Response Time</p>
            <p className="mt-2 font-display text-[24px] tracking-[0.02em] text-[#302115]">Within Minutes</p>
            <p className="mt-2 text-[12px] leading-[1.6] text-[#6c5641]">
              Our support team is active during business hours and aims to respond to every message as quickly as possible.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#d9c8ad] bg-[#fff8ec] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6c5641]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4a7c3f]" />
              Mon – Sat &middot; 10 AM – 7 PM
            </div>
          </div>
        </div>

        {/* ── We Can Help With ── */}
        <div className="mt-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">We Can Help With</p>
          <h2 className="mt-2 font-display text-[22px] uppercase tracking-[0.04em] text-[#302115]">
            Support Topics
          </h2>
          <div className="mx-auto mt-1 h-[2px] w-12 rounded-full bg-gradient-to-r from-[#a67126]/50 to-transparent" />

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SUPPORT_TOPICS.map((topic) => (
              <div
                key={topic.label}
                className="group flex flex-col items-center rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 text-center transition-all hover:-translate-y-0.5 hover:border-[#a67126]/30 hover:shadow-[0_8px_24px_rgba(146,104,56,0.08)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#a67126]/8 transition-colors group-hover:bg-[#a67126]/15">
                  <svg className="h-5 w-5 text-[#a67126]/60 transition-colors group-hover:text-[#a67126]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={topic.icon} />
                  </svg>
                </div>
                <span className="mt-3 text-[11px] font-semibold leading-snug text-[#302115]">
                  {topic.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick Links ── */}
        <div className="mt-12 rounded-2xl border border-[#d9c8ad]/60 bg-[#fffefb] p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">Quick Links</p>
          <p className="mt-1 text-[13px] text-[#6c5641]">Check our policies before reaching out — your answer might already be here.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex flex-col items-center rounded-xl border border-[#d9c8ad]/80 bg-[#fff8ec] p-4 text-center transition-all hover:-translate-y-0.5 hover:border-[#a67126]/40 hover:shadow-[0_4px_16px_rgba(146,104,56,0.08)]"
              >
                <svg className="h-5 w-5 text-[#a67126]/50 transition-colors group-hover:text-[#a67126]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
                <span className="mt-2.5 text-[11px] font-semibold text-[#302115] transition-colors group-hover:text-[#a67126]">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
