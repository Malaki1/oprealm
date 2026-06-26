import type { Van } from "@/data/luxeRoads";
import { HeartIcon } from "@/components/icons";
import { ScenicImage } from "@/components/ScenicImage";

export function VanCard({ van }: { van: Van }) {
  return (
    <article className="group overflow-hidden rounded-lg border border-navy/10 bg-warm-cream shadow-soft transition hover:-translate-y-1 hover:shadow-premium">
      <div className="relative">
        <ScenicImage image={van.image} className="aspect-[4/3]" />
        <span className="absolute left-3 top-3 z-10 rounded-full bg-warm-cream px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-navy">
          Certified
        </span>
        <button
          className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-warm-cream text-navy shadow-soft transition hover:text-gold"
          type="button"
          aria-label={`Save ${van.name}`}
        >
          <HeartIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="p-5">
        <h3 className="font-serif text-2xl leading-7 text-navy">{van.name}</h3>
        <div className="mt-4 grid grid-cols-3 divide-x divide-navy/10 rounded-md border border-navy/10 bg-cream text-center">
          <div className="px-2 py-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-ocean">Sleeps</p>
            <p className="mt-1 text-sm font-semibold text-navy">{van.sleeps}</p>
          </div>
          <div className="px-2 py-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-ocean">Type</p>
            <p className="mt-1 text-sm font-semibold text-navy">{van.type}</p>
          </div>
          <div className="px-2 py-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-ocean">Fuel</p>
            <p className="mt-1 text-sm font-semibold text-navy">{van.fuel}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <p className="font-bold text-navy">{van.price}</p>
          <a className="text-sm font-semibold text-ocean transition hover:text-gold" href="#planner">
            Enquire
          </a>
        </div>
      </div>
    </article>
  );
}
