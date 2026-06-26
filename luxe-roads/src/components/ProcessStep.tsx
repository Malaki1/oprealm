import type { ProcessStep as ProcessStepType } from "@/data/luxeRoads";
import { ProcessIcon } from "@/components/icons";

export function ProcessStep({ step, index }: { step: ProcessStepType; index: number }) {
  return (
    <article className="relative flex min-w-[210px] flex-1 flex-col items-center text-center">
      <span className="absolute left-6 top-4 z-10 grid h-7 w-7 place-items-center rounded-full bg-gold text-xs font-bold text-navy shadow-soft">
        {index + 1}
      </span>
      <div className="grid h-24 w-24 place-items-center rounded-full bg-cream shadow-soft">
        <ProcessIcon name={step.icon} className="h-[5.4rem] w-[5.4rem]" />
      </div>
      <h3 className="mt-5 font-serif text-2xl leading-7 text-navy">{step.title}</h3>
      <p className="mt-2 max-w-[13rem] text-sm leading-6 text-charcoal/70">{step.copy}</p>
    </article>
  );
}
