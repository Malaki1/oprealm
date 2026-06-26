import { withBasePath } from "@/lib/basePath";

export type CategoryIconName =
  | "coastal"
  | "hinterland"
  | "couples"
  | "family"
  | "dog"
  | "offGrid"
  | "wine"
  | "greatOcean";

export type ProcessIconName = "route" | "campervan" | "stays" | "support";

export type AddOnIconName =
  | "airport"
  | "picnic"
  | "linen"
  | "pet"
  | "bikes"
  | "surfboard"
  | "concierge";

export type VisualVariant =
  | "hero"
  | "coast"
  | "forest"
  | "couple"
  | "family"
  | "dog"
  | "offGrid"
  | "vineyard"
  | "cliff"
  | "vanSilver"
  | "vanSage"
  | "vanSand"
  | "farm"
  | "retreat";

export type ImageRef = {
  src: string;
  alt: string;
  variant: VisualVariant;
};

export type Category = {
  id: string;
  title: string;
  icon: CategoryIconName;
  image: ImageRef;
};

export type FeaturedTrip = {
  id: string;
  title: string;
  location: string;
  duration: string;
  description: string;
  price: string;
  image: ImageRef;
};

export type ProcessStep = {
  id: string;
  title: string;
  copy: string;
  icon: ProcessIconName;
};

export type Van = {
  id: string;
  name: string;
  sleeps: number;
  type: string;
  fuel: string;
  price: string;
  image: ImageRef;
};

export type TrustBadge = {
  id: string;
  title: string;
  copy: string;
  icon: ProcessIconName | AddOnIconName;
};

export type Review = {
  id: string;
  label: string;
  quote: string;
  name: string;
  trip: string;
};

export type Stay = {
  id: string;
  title: string;
  description: string;
  image: ImageRef;
};

export type AddOn = {
  id: string;
  title: string;
  copy: string;
  icon: AddOnIconName;
};

export type FooterColumn = {
  title: string;
  links: {
    label: string;
    href: string;
  }[];
};

const asset = (fileName: string) => withBasePath(`/assets/images/luxe-roads/${fileName}`);

// Place final production imagery in /public/assets/images/luxe-roads/ using these filenames.
// Every visual component includes a CSS scenic fallback so missing files never break layout.
export const heroImage: ImageRef = {
  src: asset("hero-coastal-road.jpg"),
  alt: "Premium campervan travelling along a coastal Australian road at golden hour",
  variant: "hero"
};

export const finalCtaImage: ImageRef = {
  src: asset("final-cta.jpg"),
  alt: "Sunset over a coastal Australian road with ocean views",
  variant: "cliff"
};

export const categories: Category[] = [
  {
    id: "coastal-escapes",
    title: "Coastal Escapes",
    icon: "coastal",
    image: { src: asset("category-coastal-escapes.jpg"), alt: "Curved beach road beside clear blue water", variant: "coast" }
  },
  {
    id: "hinterland-retreats",
    title: "Hinterland Retreats",
    icon: "hinterland",
    image: { src: asset("category-hinterland-retreats.jpg"), alt: "Quiet forest track through Australian hinterland", variant: "forest" }
  },
  {
    id: "couples-weekends",
    title: "Couples' Weekends",
    icon: "couples",
    image: { src: asset("category-couples-weekends.jpg"), alt: "Couple looking out over a calm coastal view", variant: "couple" }
  },
  {
    id: "family-adventures",
    title: "Family Adventures",
    icon: "family",
    image: { src: asset("category-family-adventures.jpg"), alt: "Family walking beside a relaxed beach track", variant: "family" }
  },
  {
    id: "dog-friendly-trips",
    title: "Dog-Friendly Trips",
    icon: "dog",
    image: { src: asset("category-dog-friendly-trips.jpg"), alt: "Happy dog sitting outside a campervan", variant: "dog" }
  },
  {
    id: "off-grid-luxury",
    title: "Off-Grid Luxury",
    icon: "offGrid",
    image: { src: asset("category-off-grid-luxury.jpg"), alt: "Campervan parked by pine trees under a soft evening sky", variant: "offGrid" }
  },
  {
    id: "wine-regions",
    title: "Wine Regions",
    icon: "wine",
    image: { src: asset("category-wine-regions.jpg"), alt: "Vineyard rows leading toward rolling hills", variant: "vineyard" }
  },
  {
    id: "great-ocean-road",
    title: "Great Ocean Road",
    icon: "greatOcean",
    image: { src: asset("category-great-ocean-road.jpg"), alt: "Cliff road overlooking sea stacks and ocean", variant: "cliff" }
  }
];

export const featuredTrips: FeaturedTrip[] = [
  {
    id: "great-ocean-road-escape",
    title: "Great Ocean Road Escape",
    location: "Victoria",
    duration: "5 Days",
    description: "Iconic coastline, boutique stays and unforgettable views.",
    price: "From $1,490 AUD",
    image: { src: asset("trip-great-ocean-road.jpg"), alt: "Great Ocean Road coastline with a campervan route", variant: "cliff" }
  },
  {
    id: "noosa-to-byron-bay",
    title: "Noosa to Byron Bay",
    location: "Queensland / NSW",
    duration: "7 Days",
    description: "Beach towns, national parks and relaxed coastal luxury.",
    price: "From $1,790 AUD",
    image: { src: asset("trip-noosa-byron.jpg"), alt: "Sunlit coastal bay between Noosa and Byron Bay", variant: "coast" }
  },
  {
    id: "south-coast-retreat",
    title: "South Coast Retreat",
    location: "New South Wales",
    duration: "6 Days",
    description: "Secluded beaches, local produce and coastal towns.",
    price: "From $1,690 AUD",
    image: { src: asset("trip-south-coast.jpg"), alt: "South Coast beach and headland at sunrise", variant: "retreat" }
  },
  {
    id: "margaret-river-explorer",
    title: "Margaret River Explorer",
    location: "Western Australia",
    duration: "5 Days",
    description: "Wine country, beaches and scenic coastal drives.",
    price: "From $1,590 AUD",
    image: { src: asset("trip-margaret-river.jpg"), alt: "Margaret River vineyard meeting a distant coast", variant: "vineyard" }
  }
];

export const processSteps: ProcessStep[] = [
  {
    id: "choose-route",
    title: "Choose your route",
    copy: "Explore curated itineraries crafted for scenic travel.",
    icon: "route"
  },
  {
    id: "select-campervan",
    title: "Select your campervan",
    copy: "Pick from premium, road-trip-ready vans.",
    icon: "campervan"
  },
  {
    id: "add-stays-extras",
    title: "Add stays & extras",
    copy: "Personalise with handpicked stays and experiences.",
    icon: "stays"
  },
  {
    id: "travel-support",
    title: "Travel with support",
    copy: "Get help before, during and after your trip.",
    icon: "support"
  }
];

export const vans: Van[] = [
  {
    id: "luxe-voyager",
    name: "Luxe Voyager",
    sleeps: 2,
    type: "Auto",
    fuel: "Diesel",
    price: "From $299 / night",
    image: { src: asset("van-luxe-voyager.jpg"), alt: "Silver premium campervan with coastal luggage setup", variant: "vanSilver" }
  },
  {
    id: "coastal-cruiser",
    name: "Coastal Cruiser",
    sleeps: 4,
    type: "Auto",
    fuel: "Diesel",
    price: "From $329 / night",
    image: { src: asset("van-coastal-cruiser.jpg"), alt: "Sage campervan parked near beach grass", variant: "vanSage" }
  },
  {
    id: "hinterland-retreat",
    name: "Hinterland Retreat",
    sleeps: 2,
    type: "Auto",
    fuel: "Diesel",
    price: "From $249 / night",
    image: { src: asset("van-hinterland-retreat.jpg"), alt: "Premium campervan parked beside trees in the hinterland", variant: "vanSand" }
  },
  {
    id: "family-escape",
    name: "Family Escape",
    sleeps: 6,
    type: "Auto",
    fuel: "Diesel",
    price: "From $379 / night",
    image: { src: asset("van-family-escape.jpg"), alt: "Large family campervan ready for a scenic drive", variant: "vanSilver" }
  }
];

export const trustBadges: TrustBadge[] = [
  {
    id: "certified-safety",
    title: "Certified & Safety Checked",
    copy: "Vehicle checks aligned to Luxe Roads standards.",
    icon: "campervan"
  },
  {
    id: "roadside-support",
    title: "Premium Roadside Support",
    copy: "Calm support before, during and after your trip.",
    icon: "support"
  },
  {
    id: "insurance-options",
    title: "Insurance Options",
    copy: "Choose from available cover options during booking.",
    icon: "route"
  },
  {
    id: "curated-stays",
    title: "Curated Stays",
    copy: "Handpicked stays to complement scenic itineraries.",
    icon: "stays"
  }
];

export const reviews: Review[] = [
  {
    id: "review-one",
    label: "Example testimonial",
    quote: "The route felt considered from start to finish, with quiet places we would never have found ourselves.",
    name: "Sarah, VIC",
    trip: "Great Ocean Road Escape"
  },
  {
    id: "review-two",
    label: "Example testimonial",
    quote: "A premium way to slow down. The van, stays and planning details made the journey feel effortless.",
    name: "Ben & Alisha, QLD",
    trip: "Noosa to Byron Bay"
  },
  {
    id: "review-three",
    label: "Example testimonial",
    quote: "Beautifully paced and practical. It gave us the freedom of a road trip without the admin.",
    name: "Morgan, NSW",
    trip: "South Coast Retreat"
  }
];

export const stays: Stay[] = [
  {
    id: "private-farms",
    title: "Private Farms",
    description: "Secluded country stays with room to breathe.",
    image: { src: asset("stay-private-farms.jpg"), alt: "Private farm stay with open paddocks and warm evening light", variant: "farm" }
  },
  {
    id: "coastal-stays",
    title: "Coastal Stays",
    description: "Wake up close to ocean walks and quiet bays.",
    image: { src: asset("stay-coastal.jpg"), alt: "Coastal stay overlooking a sheltered Australian bay", variant: "coast" }
  },
  {
    id: "boutique-campgrounds",
    title: "Boutique Campgrounds",
    description: "Premium powered sites with considered amenities.",
    image: { src: asset("stay-boutique-campgrounds.jpg"), alt: "Boutique campground nestled among trees", variant: "forest" }
  },
  {
    id: "eco-retreats",
    title: "Eco Retreats",
    description: "Low-impact escapes made for slower travel.",
    image: { src: asset("stay-eco-retreats.jpg"), alt: "Eco retreat cabin and campervan surrounded by native landscape", variant: "retreat" }
  }
];

export const addOns: AddOn[] = [
  { id: "airport-pickup", title: "Airport Pickup", copy: "Smooth arrival transfers.", icon: "airport" },
  { id: "picnic-pack", title: "Picnic Pack", copy: "Local produce for scenic stops.", icon: "picnic" },
  { id: "linen-pack", title: "Linen Pack", copy: "Fresh linen for easy packing.", icon: "linen" },
  { id: "pet-pack", title: "Pet Pack", copy: "For your favourite travel mate.", icon: "pet" },
  { id: "bikes", title: "Bikes", copy: "Explore towns and trails.", icon: "bikes" },
  { id: "surfboard-hire", title: "Surfboard Hire", copy: "Catch the coast your way.", icon: "surfboard" },
  { id: "concierge-planning", title: "Concierge Planning", copy: "Personalised route notes.", icon: "concierge" }
];

export const footerLinks: FooterColumn[] = [
  {
    title: "Explore",
    links: [
      { label: "Road Trips", href: "#featured-trips" },
      { label: "Destinations", href: "#browse" },
      { label: "Campervans", href: "#campervans" },
      { label: "Stays", href: "#stays" },
      { label: "Experiences", href: "#experiences" }
    ]
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "#how-it-works" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "List Your Van", href: "#owners" },
      { label: "Investor Club", href: "#owners" },
      { label: "Careers", href: "#footer" }
    ]
  },
  {
    title: "Support",
    links: [
      { label: "Help Centre", href: "#footer" },
      { label: "Roadside Support", href: "#trust" },
      { label: "Insurance", href: "#trust" },
      { label: "Terms & Conditions", href: "#footer" },
      { label: "Privacy Policy", href: "#footer" }
    ]
  }
];

export const ownerCtas = [
  {
    id: "owner",
    heading: "Earn from your campervan",
    copy: "List with Luxe Roads and we'll help take care of the rest.",
    cta: "List Your Van",
    href: "#footer",
    image: { src: asset("cta-owner.jpg"), alt: "Premium campervan parked at a scenic private stay", variant: "vanSage" as const }
  },
  {
    id: "investor",
    heading: "Join the Investor Club",
    copy: "Be part of Australia's premium road-trip platform.",
    cta: "Learn More",
    href: "#footer",
    image: { src: asset("cta-investor.jpg"), alt: "Cinematic coastal road and ocean view for premium road-trip investors", variant: "cliff" as const }
  }
];
