import AdminShell from "@/components/admin/AdminShell";

const guidelines = [
  "Use square product images at 1600x1600px minimum for zoom quality.",
  "Keep chalk texture visible with neutral lighting and no heavy filters.",
  "Primary image must be product only on a clean background.",
  "Include at least one in-use image to show grip and hand scale.",
  "Keep file size under 500KB when possible for fast storefront performance.",
];

export default function AdminImageGuidelinesPage() {
  return (
    <AdminShell title="Image Guidelines" subtitle="Upload standards for product and brand images.">
      <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#d8c19a]">Publishing Checklist</h3>
        <ul className="space-y-2 text-sm text-[#e7dccd]">
          {guidelines.map((item) => (
            <li key={item} className="rounded-lg border border-[#8b6f47]/20 bg-[#120f0c] px-3 py-2">{item}</li>
          ))}
        </ul>
      </div>
    </AdminShell>
  );
}
