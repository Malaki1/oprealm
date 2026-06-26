import type { AddOn } from "@/data/luxeRoads";
import { AddOnSvg } from "@/components/icons";

export function AddOnIcon({ addOn }: { addOn: AddOn }) {
  return (
    <article className="flex flex-col items-center text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-warm-cream shadow-soft">
        <AddOnSvg name={addOn.icon} className="h-[4.4rem] w-[4.4rem] rounded-full" />
      </div>
      <h3 className="mt-4 font-serif text-xl leading-6 text-navy">{addOn.title}</h3>
      <p className="mt-2 max-w-[9.5rem] text-sm leading-5 text-charcoal/68">{addOn.copy}</p>
    </article>
  );
}
