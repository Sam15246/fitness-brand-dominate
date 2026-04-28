export default function CheckoutRouteLoading() {
  return (
    <div className="min-h-screen bg-[#fff8ec]">
      <div className="border-b border-[#d9c8ad]/40">
        <div className="mx-auto max-w-[1240px] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
          <div className="h-3 w-24 animate-pulse rounded bg-[#e4d3b7]" />
          <div className="mt-3 h-3 w-28 animate-pulse rounded bg-[#e4d3b7]" />
          <div className="mt-2 h-10 w-48 animate-pulse rounded bg-[#e4d3b7]" />
          <div className="mt-4 flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-7 w-28 animate-pulse rounded-full bg-[#e4d3b7]/50" />
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1240px] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-8">
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div key={idx} className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 sm:p-6">
                <div className="h-3 w-36 animate-pulse rounded bg-[#e4d3b7]" />
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-2.5 w-20 animate-pulse rounded bg-[#e4d3b7]" />
                      <div className="h-[50px] w-full animate-pulse rounded-xl bg-[#e4d3b7]/60" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 sm:p-6">
              <div className="h-3 w-28 animate-pulse rounded bg-[#e4d3b7]" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-32 animate-pulse rounded bg-[#e4d3b7]" />
                    <div className="h-4 w-16 animate-pulse rounded bg-[#e4d3b7]" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 sm:p-6">
              <div className="h-3 w-24 animate-pulse rounded bg-[#e4d3b7]" />
              <div className="mt-4 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-[#e4d3b7]" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-[#e4d3b7]" />
              </div>
              <div className="mt-4 flex justify-between">
                <div className="h-4 w-16 animate-pulse rounded bg-[#e4d3b7]" />
                <div className="h-8 w-24 animate-pulse rounded bg-[#e4d3b7]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
