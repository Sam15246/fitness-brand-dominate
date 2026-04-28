export default function CartRouteLoading() {
  return (
    <div className="min-h-screen bg-[#fff8ec]">
      <div className="border-b border-[#d9c8ad]/40">
        <div className="mx-auto max-w-[1240px] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
          <div className="h-3 w-20 animate-pulse rounded bg-[#e4d3b7]" />
          <div className="mt-3 h-10 w-52 animate-pulse rounded bg-[#e4d3b7]" />
          <div className="mt-2 h-3.5 w-16 animate-pulse rounded bg-[#e4d3b7]" />
        </div>
      </div>
      <div className="mx-auto max-w-[1240px] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="mb-6 h-12 w-full animate-pulse rounded-xl bg-[#e4d3b7]/50" />
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:gap-8">
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div key={idx} className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-4 sm:p-5">
                <div className="flex gap-4">
                  <div className="h-20 w-20 animate-pulse rounded-xl bg-[#e4d3b7] sm:h-24 sm:w-24" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-[#e4d3b7]" />
                    <div className="h-3.5 w-1/3 animate-pulse rounded bg-[#e4d3b7]" />
                    <div className="h-9 w-28 animate-pulse rounded-xl bg-[#e4d3b7]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 sm:p-6">
            <div className="h-3 w-28 animate-pulse rounded bg-[#e4d3b7]" />
            <div className="mt-5 space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-[#e4d3b7]" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-[#e4d3b7]" />
            </div>
            <div className="mt-6 h-[52px] w-full animate-pulse rounded-full bg-[#e4d3b7]" />
          </div>
        </div>
      </div>
    </div>
  );
}
