import type { PolicyPageContent } from "@/lib/api";

export default function PolicyPageContent({ policy }: { policy: PolicyPageContent }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-6 shadow-[0_8px_24px_rgba(146,104,56,0.08)] md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9a7147]">Policy</p>
        <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.04em] text-[#3b2513] md:text-5xl">{policy.title}</h1>
        <div className="prose mt-6 max-w-none prose-headings:text-[#3b2513] prose-p:text-[#6f5640] prose-li:text-[#6f5640] prose-a:text-[#8f673f]">
          <div dangerouslySetInnerHTML={{ __html: policy.content }} />
        </div>
      </div>
    </div>
  );
}
