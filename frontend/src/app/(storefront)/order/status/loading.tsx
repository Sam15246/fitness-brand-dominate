export default function OrderStatusRouteLoading() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-6 shadow-[0_8px_24px_rgba(146,104,56,0.08)]">
          <div className="h-4 w-28 animate-pulse rounded bg-[#e4d3b7]" />
          <div className="mt-3 h-10 w-52 animate-pulse rounded bg-[#e4d3b7]" />
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <div className="h-10 animate-pulse rounded bg-[#e4d3b7]" />
            <div className="h-10 animate-pulse rounded bg-[#e4d3b7]" />
            <div className="h-10 w-24 animate-pulse rounded bg-[#e4d3b7]" />
          </div>
        </div>
      </div>
    </div>
  );
}
