import { ArrowIcon } from "@/components/icons";

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "light" | "ghost";
  className?: string;
  type?: "button" | "submit";
};

const variants = {
  primary: "bg-navy text-warm-cream shadow-soft hover:bg-ocean",
  secondary: "bg-gold text-navy shadow-soft hover:bg-[#d7b46f]",
  light: "bg-warm-cream text-navy shadow-soft hover:bg-cream",
  ghost: "border border-navy/20 bg-warm-cream/70 text-navy hover:border-gold hover:bg-warm-cream"
};

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition focus-visible:outline-gold";

export function Button({ children, href, variant = "primary", className = "", type = "button" }: ButtonProps) {
  const classes = `${base} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <a className={classes} href={href}>
        {children}
        <ArrowIcon className="h-4 w-4" />
      </a>
    );
  }

  return (
    <button className={classes} type={type}>
      {children}
      <ArrowIcon className="h-4 w-4" />
    </button>
  );
}
