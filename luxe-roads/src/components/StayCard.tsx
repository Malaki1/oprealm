import type { Stay } from "@/data/luxeRoads";
import { ScenicImage } from "@/components/ScenicImage";

export function StayCard({ stay }: { stay: Stay }) {
  return (
    <article className="overflow-hidden rounded-lg border border-navy/10 bg-warm-cream shadow-soft transition hover:-translate-y-1 hover:shadow-premium">
      <ScenicImage image={stay.image} className="aspect-[16/10]" overlay="dark">
        <span className="absolute right-3 top-3 z-10 rounded-full bg-gold px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-navy">
          Luxe Stay
        </span>
      </ScenicImage>
      <div className="p-5">
        <h3 className="font-serif text-2xl leading-7 text-navy">{stay.title}</h3>
        <p className="mt-2 text-sm leading-6 text-charcoal/70">{stay.description}</p>
      </div>
    </article>
  );
}
