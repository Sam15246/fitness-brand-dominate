import type { PolicyPageContent } from "@/lib/api";

export default function PolicyPageContent({ policy }: { policy: PolicyPageContent }) {
  return (
    <div className="min-h-screen bg-[#0d0b09] px-6 py-12 text-[#f4eee4]">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-[#8b6f47]/30 bg-[#15120f]/90 p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#b59a73]">Policy</p>
        <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.04em] text-[#f1ddbe] md:text-5xl">{policy.title}</h1>
        <div className="mt-6 prose prose-invert max-w-none prose-headings:text-[#f1ddbe] prose-p:text-[#d8c8af] prose-li:text-[#d8c8af] prose-a:text-[#f1ddbe]">
          <div dangerouslySetInnerHTML={{ __html: policy.content }} />
        </div>
      </div>
    </div>
  );
}
