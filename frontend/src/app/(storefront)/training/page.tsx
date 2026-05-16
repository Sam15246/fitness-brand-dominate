import type { Metadata } from "next";

import TrainingWaitlistForm from "@/components/training/TrainingWaitlistForm";

const TRAINING_FEATURES = [
  {
    title: "Skill training",
    body: "Calisthenics progressions, movement drills, and strength-focused programming.",
  },
  {
    title: "Athlete environment",
    body: "An atmosphere built for work ethic, clean training, and high standards.",
  },
  {
    title: "Community events",
    body: "Member sessions, pop-ups, and collaborations that create momentum.",
  },
  {
    title: "Coaching",
    body: "A place where athletes can learn, sharpen technique, and level up.",
  },
] as const;

const TRAINING_ZONES = [
  { label: "Calisthenics rigs", hint: "Pulls, levers, holds" },
  { label: "Street workout area", hint: "Bars, flow, freestyle" },
  { label: "Strength zone", hint: "Weighted work, control" },
  { label: "Community sessions", hint: "Movement culture in motion" },
] as const;

export const metadata: Metadata = {
  title: "DOMINATE GYM | DOMINATE Training Facility",
  description: "Coming soon: a premium training facility for calisthenics, strength, movement, and athlete culture.",
};

export default function TrainingPage() {
  return (
    <main className="bg-[#0d0b09]">
        <section className="relative overflow-hidden bg-[#0d0b09] pb-16 pt-16 md:pb-24 md:pt-20">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 10%, rgba(166,113,38,0.16) 0%, transparent 34%), radial-gradient(circle at 15% 85%, rgba(255,255,255,0.04) 0%, transparent 24%), radial-gradient(circle at 85% 75%, rgba(212,148,59,0.10) 0%, transparent 26%)" }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
              <div className="max-w-[680px] animate-[fadeInUp_0.7s_ease-out_both]">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4943b]">DOMINATE GYM</p>
                <h1 className="font-display text-[clamp(48px,10vw,112px)] uppercase leading-[0.9] tracking-[0.03em] text-[#f4eee4]">
                  DOMINATE
                  <br />
                  Training Facility
                </h1>
                <p className="mt-4 text-[13px] font-bold uppercase tracking-[0.22em] text-[#f4eee4]/28">Coming Soon · Foundation Phase · Building the next training culture</p>
                <p className="mt-5 max-w-[560px] text-[14px] leading-[1.9] text-[#f4eee4]/48 md:text-[15px]">
                  A dedicated space for calisthenics, street workout, strength, movement, and athlete culture.
                </p>
              </div>

              <div className="rounded-[30px] border border-[#a67126]/12 bg-white/[0.03] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)] md:p-6">
                <div className="grid grid-cols-2 gap-3">
                  {TRAINING_ZONES.map((zone) => (
                    <div
                      key={zone.label}
                      className="rounded-[22px] border border-[#a67126]/10 bg-[#090705] p-4 transition-all hover:-translate-y-1 hover:border-[#a67126]/24"
                    >
                      <div className="mb-8 h-20 rounded-2xl border border-dashed border-[#a67126]/16 bg-[linear-gradient(180deg,rgba(166,113,38,0.14)_0%,rgba(9,7,5,0.1)_100%)]" aria-hidden="true" />
                      <p className="font-display text-[22px] uppercase tracking-[0.03em] text-[#f4eee4]">{zone.label}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#f4eee4]/26">{zone.hint}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#a67126]/10 bg-[#1e1710] py-[72px] md:py-24">
          <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
            <div className="mb-10 max-w-[620px]">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4943b]">What it will hold</p>
              <h2 className="font-display text-[clamp(34px,6vw,56px)] uppercase leading-[0.95] tracking-[0.04em] text-[#f4eee4]">
                A space for serious training.
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {TRAINING_FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="group rounded-[24px] border border-[#a67126]/12 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#a67126]/28 hover:bg-[#a67126]/[0.08]"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#a67126]/12 text-[#d4943b] transition-colors group-hover:bg-[#a67126]/18">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m4-4H8m12 0a8 8 0 11-16 0 8 8 0 0116 0z" />
                    </svg>
                  </div>
                  <h3 className="font-display text-[26px] uppercase tracking-[0.03em] text-[#f4eee4]">{feature.title}</h3>
                  <p className="mt-2 text-[12px] leading-[1.8] text-[#f4eee4]/42">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#0d0b09] py-[72px] md:py-24">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 0%, rgba(166,113,38,0.12) 0%, transparent 34%)" }}
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto grid max-w-[1240px] gap-10 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
            <div className="max-w-[480px]">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4943b]">Join the movement</p>
              <h2 className="font-display text-[clamp(34px,6vw,56px)] uppercase leading-[0.95] tracking-[0.04em] text-[#f4eee4]">
                Get launch updates.
              </h2>
              <p className="mt-4 text-[14px] leading-[1.9] text-[#f4eee4]/46">
                Be first to know when the facility enters the next phase.
              </p>
            </div>

            <div className="rounded-[30px] border border-[#a67126]/12 bg-white/[0.03] p-5 md:p-6">
              <div className="max-w-[620px]">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4943b]">Early access</p>
                <p className="mt-2 text-[13px] leading-[1.8] text-[#f4eee4]/42">
                  Join the waitlist to receive launch notes, community session updates, and DOMINATE Training Facility announcements.
                </p>
                <TrainingWaitlistForm />
              </div>
            </div>
          </div>
        </section>
      </main>
  );
}