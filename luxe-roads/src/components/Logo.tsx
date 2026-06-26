type LogoProps = {
  compact?: boolean;
  className?: string;
  tone?: "dark" | "light";
  showWordmarkOnMobile?: boolean;
};

export function Logo({ compact = false, className = "", tone = "dark", showWordmarkOnMobile = true }: LogoProps) {
  const textClass = tone === "light" ? "text-warm-cream" : "text-navy";
  const taglineClass = tone === "light" ? "text-warm-cream/68" : "text-ocean";
  const wordmarkVisibility = showWordmarkOnMobile ? "flex" : "hidden sm:flex";

  return (
    <a className={`inline-flex items-center gap-3 ${textClass} ${className}`} href="#home" aria-label="Luxe Roads home">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/70 bg-warm-cream shadow-soft">
        <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none" aria-hidden="true">
          <circle cx="24" cy="24" r="20" stroke="#102B35" strokeWidth="1.4" />
          <path d="M9 29c8-4 15-4 23 0 3 2 6 2 9 1" stroke="#102B35" strokeWidth="1.35" strokeLinecap="round" />
          <path d="M13 34c7-3 14-3 21 0" stroke="#A7B59B" strokeWidth="1.35" strokeLinecap="round" />
          <path d="M18 27c4-7 11-10 19-7" stroke="#102B35" strokeWidth="1.35" strokeLinecap="round" />
          <path d="M15 21a6 6 0 0 1 10 0" stroke="#C8A15A" strokeWidth="1.35" strokeLinecap="round" />
          <path d="M32 14c2 5 0 13-5 19m4-14c2-3 5-5 9-5m-9 4c-3-2-6-2-9 0m8 6c3-2 6-2 9 0" stroke="#102B35" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
      {!compact && (
        <span className={`${wordmarkVisibility} flex-col leading-none`}>
          <span className="font-serif text-[1.35rem] uppercase tracking-[0.22em]">Luxe Roads</span>
          <span className={`mt-1 hidden text-[0.66rem] font-medium tracking-[0.12em] sm:block ${taglineClass}`}>
            Luxury Road Trips, Beautifully Planned
          </span>
        </span>
      )}
    </a>
  );
}
