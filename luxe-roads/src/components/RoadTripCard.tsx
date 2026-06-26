import type { FeaturedTrip } from "@/data/luxeRoads";
import { Button } from "@/components/Button";
import { RouteMapOverlay } from "@/components/icons";
import { ScenicImage } from "@/components/ScenicImage";

export function RoadTripCard({ trip }: { trip: FeaturedTrip }) {
  return (
    <article className="group flex overflow-hidden rounded-lg border border-navy/10 bg-warm-cream shadow-soft transition hover:-translate-y-1 hover:shadow-premium md:block">
      <div className="relative w-36 shrink-0 md:w-full">
        <ScenicImage image={trip.image} className="h-full min-h-52 md:aspect-[4/3] md:h-auto" overlay="dark">
          <span className="absolute left-3 top-3 z-10 rounded-full bg-warm-cream px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-navy">
            {trip.duration}
          </span>
          <RouteMapOverlay className="absolute right-2 top-3 z-10 h-16 w-24 opacity-85" />
        </ScenicImage>
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4 md:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">{trip.location}</p>
        <h3 className="mt-2 font-serif text-2xl leading-7 text-navy">{trip.title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-charcoal/72">{trip.description}</p>
        <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-navy">{trip.price}</p>
          <Button href="#planner" variant="ghost" className="min-h-10 px-4 py-2 text-xs">
            View Trip
          </Button>
        </div>
      </div>
    </article>
  );
}
