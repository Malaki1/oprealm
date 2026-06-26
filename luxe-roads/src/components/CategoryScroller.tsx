import type { Category } from "@/data/luxeRoads";
import { CategoryCard } from "@/components/CategoryCard";

export function CategoryScroller({ categories }: { categories: Category[] }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-3 hide-scrollbar md:mx-0 md:overflow-visible md:px-0">
      <div className="grid auto-cols-[154px] grid-flow-col gap-5 md:grid-flow-row md:grid-cols-4 lg:grid-cols-8">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
}
