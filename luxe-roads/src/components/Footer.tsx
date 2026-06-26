import type { FooterColumn } from "@/data/luxeRoads";
import { Logo } from "@/components/Logo";

export function Footer({ columns }: { columns: FooterColumn[] }) {
  return (
    <footer id="footer" className="bg-navy px-5 py-14 text-warm-cream md:px-8">
      <div className="mx-auto grid max-w-content gap-10 lg:grid-cols-[1.2fr_2fr_1.1fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-5 max-w-xs text-sm leading-6 text-warm-cream/72">Luxury road trips, beautifully planned.</p>
          <div className="mt-6 flex gap-3" aria-label="Social links">
            {["Instagram", "Facebook", "Pinterest"].map((label) => (
              <a
                key={label}
                className="grid h-10 w-10 place-items-center rounded-full border border-warm-cream/20 text-xs font-bold transition hover:border-gold hover:text-gold"
                href="#footer"
                aria-label={label}
              >
                {label.slice(0, 1)}
              </a>
            ))}
          </div>
        </div>
        <nav className="grid gap-8 sm:grid-cols-3" aria-label="Footer navigation">
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{column.title}</h3>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a className="text-sm text-warm-cream/72 transition hover:text-warm-cream" href={link.href}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Stay Inspired</h3>
          <p className="mt-4 text-sm leading-6 text-warm-cream/72">Get scenic route ideas and launch updates.</p>
          <form className="mt-5 flex gap-2" aria-label="Subscribe to Luxe Roads updates">
            <label className="sr-only" htmlFor="footer-email">
              Email address
            </label>
            <input
              id="footer-email"
              className="min-h-11 min-w-0 flex-1 rounded-full border border-warm-cream/20 bg-warm-cream/10 px-4 text-sm text-warm-cream placeholder:text-warm-cream/45"
              type="email"
              placeholder="Email address"
            />
            <button className="min-h-11 rounded-full bg-gold px-5 text-sm font-bold text-navy transition hover:bg-sand" type="submit">
              Subscribe
            </button>
          </form>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-content flex-col gap-3 border-t border-warm-cream/12 pt-6 text-xs text-warm-cream/54 md:flex-row md:items-center md:justify-between">
        <p>© 2026 Luxe Roads. Demo website mockup.</p>
        <p>No external accreditation or legal insurance claims are implied.</p>
      </div>
    </footer>
  );
}
