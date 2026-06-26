import type { Review } from "@/data/luxeRoads";

export function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="rounded-lg border border-navy/10 bg-warm-cream p-5 shadow-soft">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-gold">{review.label}</p>
      <div className="mt-3 flex gap-1 text-gold" aria-hidden="true">
        {"*****".split("").map((star, index) => (
          <span key={`${star}-${index}`}>★</span>
        ))}
      </div>
      <blockquote className="mt-4 text-sm leading-6 text-charcoal/78">&quot;{review.quote}&quot;</blockquote>
      <p className="mt-5 font-serif text-lg text-navy">{review.name}</p>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ocean">{review.trip}</p>
    </article>
  );
}
