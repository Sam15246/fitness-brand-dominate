export default function CartRouteLoading() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 h-12 w-40 animate-pulse rounded bg-[#e4d3b7]" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-4">
              <div className="flex gap-4">
                <div className="h-24 w-24 animate-pulse rounded-lg bg-[#e4d3b7]" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-1/2 animate-pulse rounded bg-[#e4d3b7]" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-[#e4d3b7]" />
                  <div className="h-9 w-32 animate-pulse rounded-full bg-[#e4d3b7]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
