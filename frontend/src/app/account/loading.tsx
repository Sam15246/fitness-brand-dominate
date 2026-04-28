export default function AccountLoading() {
  return (
    <div className="min-h-screen bg-[#fff8ec]">
      <div className="border-b border-[#d9c8ad]/40">
        <div className="mx-auto max-w-[900px] px-5 py-6 sm:px-8 sm:py-8">
          <div className="h-3 w-20 animate-pulse rounded bg-[#e4d3b7]" />
          <div className="mt-3 h-10 w-52 animate-pulse rounded bg-[#e4d3b7]" />
          <div className="mt-2 h-3.5 w-64 animate-pulse rounded bg-[#e4d3b7]" />
          <div className="mt-6 flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-[#e4d3b7]/60" />
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[900px] px-5 py-6 sm:px-8 sm:py-8">
        <div className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 sm:p-6">
          <div className="flex items-center gap-4 border-b border-[#d9c8ad]/50 pb-5">
            <div className="h-14 w-14 animate-pulse rounded-full bg-[#e4d3b7]" />
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-[#e4d3b7]" />
              <div className="h-3 w-48 animate-pulse rounded bg-[#e4d3b7]" />
            </div>
          </div>
          <div className="mt-6 space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-2.5 w-20 animate-pulse rounded bg-[#e4d3b7]" />
                <div className="h-[50px] w-full animate-pulse rounded-xl bg-[#e4d3b7]/60" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
