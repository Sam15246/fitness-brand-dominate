export default function CheckoutRouteLoading() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 h-12 w-52 animate-pulse rounded bg-[#e4d3b7]" />
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4 rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-10 w-full animate-pulse rounded bg-[#e4d3b7]" />
            ))}
            <div className="h-11 w-40 animate-pulse rounded-full bg-[#e4d3b7]" />
          </div>
          <div className="rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-5">
            <div className="h-5 w-36 animate-pulse rounded bg-[#e4d3b7]" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-4 w-full animate-pulse rounded bg-[#e4d3b7]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
