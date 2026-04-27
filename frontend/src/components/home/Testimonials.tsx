const REVIEWS = [
  {
    quote: "The liquid chalk stays grippy through long sessions and does not cake up.",
    name: "Aman V.",
    role: "Calisthenics Athlete",
  },
  {
    quote: "Parallettes feel stable and premium. Great for handstands and dips.",
    name: "Ritika S.",
    role: "Strength Coach",
  },
  {
    quote: "From checkout to delivery the whole experience was smooth and reliable.",
    name: "Harsh M.",
    role: "Returning Customer",
  },
] as const;

function Stars() {
  return (
    <div className="mb-4 flex gap-[3px]" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          className="h-[11px] w-[11px] shrink-0 bg-[#d4943b]"
          style={{ clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)" }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section id="testimonials" className="bg-[#f5e7d2] py-[72px] md:py-24">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="mb-11 md:mb-14 md:text-center">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">Community Feedback</p>
          <h2 className="font-display text-[clamp(32px,6vw,52px)] uppercase leading-none tracking-[0.04em] text-[#302115]">
            Athletes Who Train With Dominate
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map((review) => (
            <article
              key={review.name}
              className="rounded-[20px] border border-[#d9c8ad] bg-[#fff8ec] p-7 shadow-[0_4px_16px_rgba(146,104,56,0.05)]"
            >
              <Stars />
              <blockquote className="mb-[22px] text-[14px] italic leading-[1.78] text-[#302115]">"{review.quote}"</blockquote>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#302115]">{review.name}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-[#a67126]">{review.role}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
