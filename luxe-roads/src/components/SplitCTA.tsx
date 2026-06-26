import type { ImageRef } from "@/data/luxeRoads";
import { Button } from "@/components/Button";
import { ScenicImage } from "@/components/ScenicImage";

type SplitCTAItem = {
  id: string;
  heading: string;
  copy: string;
  cta: string;
  href: string;
  image: ImageRef;
};

export function SplitCTA({ items }: { items: SplitCTAItem[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {items.map((item) => (
        <ScenicImage key={item.id} image={item.image} className="min-h-[280px] rounded-lg" overlay="dark">
          <div className="absolute inset-0 z-10 flex flex-col justify-end bg-gradient-to-t from-navy/78 via-navy/34 to-transparent p-6 md:p-8">
            <h3 className="max-w-md font-serif text-4xl leading-[1.02] text-warm-cream text-balance">{item.heading}</h3>
            <p className="mt-3 max-w-sm text-sm leading-6 text-warm-cream/82">{item.copy}</p>
            <div className="mt-6">
              <Button href={item.href} variant="light">
                {item.cta}
              </Button>
            </div>
          </div>
        </ScenicImage>
      ))}
    </div>
  );
}
