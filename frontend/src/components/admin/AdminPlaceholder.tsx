type AdminPlaceholderProps = {
  heading: string;
  description: string;
  routeHint?: string;
};

export default function AdminPlaceholder({ heading, description, routeHint }: AdminPlaceholderProps) {
  return (
    <section className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-6">
      <h2 className="text-xl font-semibold text-[#f2dfc0]">{heading}</h2>
      <p className="mt-2 text-sm text-[#d8c19a]">{description}</p>
      {routeHint ? (
        <p className="mt-3 text-xs uppercase tracking-[0.1em] text-[#b59a73]">Route: {routeHint}</p>
      ) : null}
      <div className="mt-5 rounded-lg border border-[#8b6f47]/25 bg-[#120f0c] p-4 text-sm text-[#cdb793]">
        This screen is migrated in the new stack and ready for API wiring.
      </div>
    </section>
  );
}
