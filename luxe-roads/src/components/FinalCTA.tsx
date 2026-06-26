import { finalCtaImage } from "@/data/luxeRoads";
import { Button } from "@/components/Button";
import { ScenicImage } from "@/components/ScenicImage";

export function FinalCTA() {
  return (
    <section className="px-0" aria-labelledby="final-cta-heading">
      <ScenicImage image={finalCtaImage} className="min-h-[360px]" overlay="dark">
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-navy/28 px-5 text-center">
          <div className="max-w-3xl">
            <h2 id="final-cta-heading" className="font-serif text-5xl leading-[1.02] text-warm-cream text-balance md:text-6xl">
              Scenic Roads. Timeless Journeys.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-warm-cream/84 md:text-lg">
              Curated routes. Premium vans. Unforgettable memories.
            </p>
            <div className="mt-8">
              <Button href="#planner" variant="secondary">
                Plan Your Journey
              </Button>
            </div>
          </div>
        </div>
      </ScenicImage>
    </section>
  );
}
