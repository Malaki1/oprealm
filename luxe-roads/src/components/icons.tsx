import type { AddOnIconName, CategoryIconName, ProcessIconName } from "@/data/luxeRoads";
import Image from "next/image";

type IconProps = {
  className?: string;
};

const categoryIconSrc: Record<CategoryIconName, string> = {
  coastal: "/assets/icons/luxe-roads/categories/coastal.png",
  hinterland: "/assets/icons/luxe-roads/categories/hinterland.png",
  couples: "/assets/icons/luxe-roads/categories/couples.png",
  family: "/assets/icons/luxe-roads/categories/family.png",
  dog: "/assets/icons/luxe-roads/categories/dog.png",
  offGrid: "/assets/icons/luxe-roads/categories/off-grid.png",
  wine: "/assets/icons/luxe-roads/categories/wine.png",
  greatOcean: "/assets/icons/luxe-roads/categories/great-ocean.png"
};

const processIconSrc: Record<ProcessIconName, string> = {
  route: "/assets/icons/luxe-roads/travel-set/tailored-experiences.png",
  campervan: "/assets/icons/luxe-roads/travel-set/immaculate-vans.png",
  stays: "/assets/icons/luxe-roads/travel-set/added-extras.png",
  support: "/assets/icons/luxe-roads/travel-set/roadside.png"
};

const addOnIconSrc: Record<AddOnIconName, string> = {
  airport: "/assets/icons/luxe-roads/travel-set/flexible-pickup.png",
  picnic: "/assets/icons/luxe-roads/travel-set/added-extras.png",
  linen: "/assets/icons/luxe-roads/travel-set/added-extras.png",
  pet: "/assets/icons/luxe-roads/categories/dog.png",
  bikes: "/assets/icons/luxe-roads/travel-set/tailored-experiences.png",
  surfboard: "/assets/icons/luxe-roads/categories/coastal.png",
  concierge: "/assets/icons/luxe-roads/travel-set/personal-concierge.png"
};

function IconImage({ src, className }: IconProps & { src: string }) {
  return (
    <Image
      aria-hidden="true"
      alt=""
      className={`block object-contain ${className ?? ""}`}
      height={180}
      src={src}
      width={180}
    />
  );
}

export function CategoryIcon({ name, className }: IconProps & { name: CategoryIconName }) {
  return <IconImage src={categoryIconSrc[name]} className={className} />;
}

export function ProcessIcon({ name, className }: IconProps & { name: ProcessIconName }) {
  return <IconImage src={processIconSrc[name]} className={className} />;
}

export function AddOnSvg({ name, className }: IconProps & { name: AddOnIconName }) {
  return <IconImage src={addOnIconSrc[name]} className={className} />;
}

export function ArrowIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M5 10h10m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HeartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 20s-7-4.5-9-9.2C1.2 6.6 4.2 3.5 8 4.2c1.7.3 3 1.4 4 3 1-1.6 2.3-2.7 4-3 3.8-.7 6.8 2.4 5 6.6C19 15.5 12 20 12 20Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function RouteMapOverlay({ className }: IconProps) {
  return (
    <svg viewBox="0 0 130 90" fill="none" className={className} aria-hidden="true">
      <path d="M8 72c20-28 32-40 51-36 20 5 24-22 43-19 11 2 17 12 20 22" stroke="#FFFDF7" strokeWidth="2" className="route-line" opacity="0.78" />
      <circle cx="9" cy="72" r="4" fill="#C8A15A" />
      <circle cx="121" cy="39" r="4" fill="#C8A15A" />
    </svg>
  );
}
