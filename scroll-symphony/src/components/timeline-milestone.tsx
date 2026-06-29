import type { TimelineMilestoneData } from "@/data/timeline";
import Image from "next/image";

const accentClasses = {
  cyan: {
    year: "from-cyan to-white",
    dot: "bg-cyan shadow-[0_0_34px_rgba(66,245,215,0.45)]",
    line: "from-cyan/80 to-transparent",
    icon: "bg-cyan/12 text-cyan",
    badge: "border-cyan/20 bg-cyan/10 text-cyan"
  },
  blue: {
    year: "from-electric to-white",
    dot: "bg-electric shadow-[0_0_34px_rgba(53,167,255,0.45)]",
    line: "from-electric/80 to-transparent",
    icon: "bg-electric/12 text-electric",
    badge: "border-electric/20 bg-electric/10 text-electric"
  },
  violet: {
    year: "from-violet to-white",
    dot: "bg-violet shadow-[0_0_34px_rgba(138,92,255,0.45)]",
    line: "from-violet/80 to-transparent",
    icon: "bg-violet/12 text-violet",
    badge: "border-violet/20 bg-violet/10 text-violet"
  },
  gold: {
    year: "from-auric to-white",
    dot: "bg-auric shadow-[0_0_34px_rgba(246,198,91,0.45)]",
    line: "from-auric/80 to-transparent",
    icon: "bg-auric/12 text-auric",
    badge: "border-auric/20 bg-auric/10 text-auric"
  }
};

export function TimelineMilestone({ milestone, index }: { milestone: TimelineMilestoneData; index: number }) {
  const Icon = milestone.icon;
  const accent = accentClasses[milestone.accent];

  return (
    <article className="timeline-milestone relative grid gap-4 md:grid-cols-[132px_64px_minmax(0,1fr)] lg:grid-cols-[164px_78px_minmax(0,1fr)] md:gap-0">
      <div className="timeline-year flex items-center md:justify-end md:pr-6 lg:pr-8">
        <div>
          <div
            className={`bg-gradient-to-r ${accent.year} bg-clip-text font-display text-5xl font-black leading-none text-transparent md:text-6xl`}
          >
            {milestone.year}
          </div>
          <div className="mt-2 text-xs font-black uppercase tracking-[0.22em] text-white/38">
            Milestone {String(index + 1).padStart(2, "0")}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 md:hidden" aria-hidden="true">
        <span className={`grid size-6 place-items-center rounded-full border border-white/35 ${accent.dot}`}>
          <span className="size-2 rounded-full bg-white" />
        </span>
        <span className={`h-px flex-1 bg-gradient-to-r ${accent.line}`} />
      </div>

      <div className="timeline-axis relative hidden md:flex md:items-center md:justify-center">
        <span
          className={`timeline-dot relative z-10 grid size-7 place-items-center rounded-full border border-white/35 ${accent.dot}`}
          aria-hidden="true"
        >
          <span className="size-2 rounded-full bg-white" />
        </span>
        <span className={`timeline-connector absolute left-[calc(50%+14px)] top-1/2 h-px w-8 lg:w-12 bg-gradient-to-r ${accent.line}`} aria-hidden="true" />
      </div>

      <div className="timeline-card glass relative overflow-hidden rounded-[28px] p-5 transition will-change-transform md:ml-6 md:p-6 lg:ml-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(66,245,215,0.12),transparent_36%)] opacity-70" aria-hidden="true" />
        <div className="relative">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className={`grid size-11 place-items-center rounded-2xl ${accent.icon}`}>
                  <Icon size={21} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan">{milestone.category}</div>
                  <h3 className="mt-1 font-display text-3xl font-black leading-tight md:text-4xl">{milestone.title}</h3>
                </div>
              </div>
              <p className="max-w-3xl text-base leading-relaxed text-silver md:text-lg">{milestone.description}</p>
            </div>

            {milestone.logo ? (
              <div
                className={`timeline-logo-stage flex min-h-28 items-center justify-center rounded-3xl border p-4 ${
                  milestone.logo.tone === "light"
                    ? "border-cyan/15 bg-white/[0.03]"
                    : "border-white/10 bg-black/25"
                }`}
              >
                <Image
                  src={milestone.logo.src}
                  alt={milestone.logo.alt}
                  width={260}
                  height={112}
                  className="max-h-24 w-full object-contain drop-shadow-[0_0_22px_rgba(66,245,215,0.16)]"
                  loading="lazy"
                  sizes="260px"
                />
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {milestone.badges.map((badge) => (
              <span key={badge} className={`rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] ${accent.badge}`}>
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
