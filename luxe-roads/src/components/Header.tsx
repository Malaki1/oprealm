import { Button } from "@/components/Button";
import { MenuIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";

const navItems = [
  { label: "Road Trips", href: "#featured-trips" },
  { label: "Destinations", href: "#browse" },
  { label: "Campervans", href: "#campervans" },
  { label: "Stays", href: "#stays" },
  { label: "Experiences", href: "#experiences" },
  { label: "List Your Van", href: "#owners" },
  { label: "Investor Club", href: "#owners" }
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-navy/10 bg-warm-cream/92 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-content items-center justify-between px-5 md:px-8">
        <Logo showWordmarkOnMobile={false} />
        <nav aria-label="Primary navigation" className="hidden items-center gap-6 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              className="text-sm font-medium text-navy/78 transition hover:text-navy focus-visible:text-navy"
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="hidden lg:block">
          <Button href="#planner">Plan Your Journey</Button>
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <Button href="#featured-trips" className="min-h-10 shrink-0 px-3 py-2 text-xs">
            Explore Trips
          </Button>
          <details className="group relative h-11 w-11 shrink-0">
            <summary className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-full border border-navy/15 bg-warm-cream text-navy transition hover:border-gold [&::-webkit-details-marker]:hidden">
              <span className="sr-only">Open navigation menu</span>
              <MenuIcon className="h-5 w-5" />
            </summary>
            <nav
              aria-label="Mobile navigation"
              className="absolute right-0 mt-3 w-64 rounded-lg border border-navy/10 bg-warm-cream p-3 shadow-premium"
            >
              {navItems.map((item) => (
                <a
                  key={item.label}
                  className="block rounded-md px-3 py-3 text-sm font-medium text-navy/78 transition hover:bg-cream hover:text-navy"
                  href={item.href}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
