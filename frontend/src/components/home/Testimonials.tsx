"use client";

const REVIEWS = [
  {
    quote: "The liquid chalk stays grippy through long sessions and does not cake up.",
    name: "Aman V.",
    role: "Calisthenics Athlete",
    rating: 5,
  },
  {
    quote: "Parallettes feel stable and premium. Great for handstands and dips.",
    name: "Ritika S.",
    role: "Strength Coach",
    rating: 5,
  },
  {
    quote: "From checkout to delivery the whole experience was smooth and reliable.",
    name: "Harsh M.",
    role: "Returning Customer",
    rating: 5,
  },
  {
    quote: "Best liquid chalk I've used in India. Dries fast and lasts through my entire workout.",
    name: "Karan D.",
    role: "CrossFit Athlete",
    rating: 5,
  },
  {
    quote: "The wood quality on the parallettes is insane for this price point. No wobble at all.",
    name: "Priya N.",
    role: "Gymnastics Enthusiast",
    rating: 5,
  },
  {
    quote: "Ordered twice already. The grip improvement is night and day for pull-ups.",
    name: "Rohan P.",
    role: "Street Workout",
    rating: 5,
  },
] as const;

function Stars({ count }: { count: number }) {
  return (
    <div className="mb-4 flex gap-[3px]" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: count }).map((_, index) => (
        <svg key={index} className="h-[13px] w-[13px] text-[#d4943b]" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function Testimonials() {
  // Duplicate for infinite scroll illusion
  const doubled = [...REVIEWS, ...REVIEWS];

  return (
    <section id="testimonials" className="bg-[#f5e7d2] py-[72px] md:py-24">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="mb-11 md:mb-14 md:text-center">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">Community Feedback</p>
          <h2 className="font-display text-[clamp(32px,6vw,52px)] uppercase leading-none tracking-[0.04em] text-[#302115]">
            Athletes Who Train With Dominate
          </h2>
          <p className="mx-auto mt-4 max-w-[440px] text-[13px] leading-[1.75] text-[#6c5641]">
            Real reviews from real athletes who trust Dominate in their training.
          </p>
        </div>
      </div>

      {/* Marquee carousel — full width */}
      <div className="group relative overflow-hidden">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#f5e7d2] to-transparent md:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#f5e7d2] to-transparent md:w-24" />

        <div className="flex animate-[marquee_40s_linear_infinite] gap-5 group-hover:[animation-play-state:paused]">
          {doubled.map((review, i) => (
            <article
              key={`${review.name}-${i}`}
              className="w-[320px] shrink-0 rounded-[20px] border border-[#d9c8ad] bg-[#fff8ec] p-7 shadow-[0_4px_16px_rgba(146,104,56,0.05)] transition-shadow hover:shadow-[0_8px_32px_rgba(146,104,56,0.12)] md:w-[360px]"
            >
              <Stars count={review.rating} />
              <blockquote className="mb-[22px] min-h-[60px] text-[14px] leading-[1.78] text-[#302115]">
                &ldquo;{review.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#a67126]/12 text-[11px] font-bold text-[#a67126]">
                  {review.name.split(" ").map(w => w[0]).join("")}
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#302115]">{review.name}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-[#a67126]">{review.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
