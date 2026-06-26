"use client";

import { useEffect, useState } from "react";

export function StickyMobileCTA() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setIsVisible(window.scrollY > 760);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });

    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  return (
    <a
      className={`fixed bottom-4 left-4 right-4 z-50 flex min-h-12 items-center justify-center rounded-full bg-navy px-5 text-sm font-bold text-warm-cream shadow-premium transition duration-300 md:hidden ${
        isVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-16 opacity-0"
      }`}
      href="#featured-trips"
    >
      Explore Trips
    </a>
  );
}
