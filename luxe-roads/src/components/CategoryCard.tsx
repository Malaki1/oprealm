import type { Category } from "@/data/luxeRoads";
import { CategoryIcon } from "@/components/icons";
import { ScenicImage } from "@/components/ScenicImage";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <a
      className="group block w-[154px] shrink-0 focus-visible:rounded-lg md:w-auto"
      href={`#${category.id}`}
      aria-label={`Browse ${category.title}`}
    >
      <div className="relative">
        <ScenicImage
          image={category.image}
          className="aspect-[4/5] rounded-lg shadow-soft transition duration-500 group-hover:-translate-y-1 group-hover:shadow-premium"
        />
        <div className="absolute -bottom-8 left-1/2 grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full border border-gold/55 bg-warm-cream shadow-soft transition group-hover:border-gold group-hover:bg-cream">
          <CategoryIcon name={category.icon} className="h-[3.9rem] w-[3.9rem] translate-x-0.5 rounded-full" />
        </div>
      </div>
      <p className="mt-10 text-center font-serif text-lg leading-5 text-navy">{category.title}</p>
    </a>
  );
}
