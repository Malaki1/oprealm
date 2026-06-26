type SectionHeaderProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  copy?: string;
  align?: "left" | "center";
  action?: React.ReactNode;
};

export function SectionHeader({ id, eyebrow, title, copy, align = "center", action }: SectionHeaderProps) {
  const isCenter = align === "center";

  return (
    <div className={`mb-9 flex flex-col gap-4 ${isCenter ? "items-center text-center" : "items-start text-left"} md:mb-11`}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
          {eyebrow}
        </p>
      )}
      <div className={`flex w-full flex-col gap-4 ${action ? "md:flex-row md:items-end md:justify-between" : ""}`}>
        <div className={isCenter ? "mx-auto max-w-2xl" : "max-w-2xl"}>
          <h2 id={id} className="font-serif text-4xl font-normal leading-[1.02] text-navy text-balance md:text-5xl">
            {title}
          </h2>
          {copy && <p className="mt-4 text-base leading-7 text-charcoal/72 md:text-lg">{copy}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
