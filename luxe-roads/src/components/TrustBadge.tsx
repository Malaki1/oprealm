import type { ProcessIconName, TrustBadge as TrustBadgeType } from "@/data/luxeRoads";
import { AddOnSvg, ProcessIcon } from "@/components/icons";

const processIconNames = new Set<string>(["route", "campervan", "stays", "support"]);

function isProcessIcon(icon: TrustBadgeType["icon"]): icon is ProcessIconName {
  return processIconNames.has(icon);
}

export function TrustBadge({ badge }: { badge: TrustBadgeType }) {
  return (
    <article className="flex gap-4 rounded-lg border border-navy/10 bg-warm-cream p-4">
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-cream">
        {isProcessIcon(badge.icon) ? (
          <ProcessIcon name={badge.icon} className="h-14 w-14" />
        ) : (
          <AddOnSvg name={badge.icon} className="h-14 w-14" />
        )}
      </div>
      <div>
        <h3 className="font-serif text-xl leading-6 text-navy">{badge.title}</h3>
        <p className="mt-1 text-sm leading-6 text-charcoal/70">{badge.copy}</p>
      </div>
    </article>
  );
}
