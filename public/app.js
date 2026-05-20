const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const animatedItems = document.querySelectorAll(
  ".reveal, .reveal-section, .platform-panel, .hero-strip"
);
const atmosphereSections = document.querySelectorAll(
  ".path-section, .curriculum-section, .coach-section, .dashboard-section, .pricing-section, .faq-section"
);
const creatorStickers = [
  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M25 7c7 3 11 10 11 19l-7 7h-8l-7-7c0-9 4-16 11-19z"/><path d="M19 33l-4 7 7-4M31 33l4 7-7-4"/><circle cx="25" cy="20" r="4"/></svg>',
  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M30 6l12 12-24 24H6v-12L30 6z"/><path d="M25 11l12 12M11 31l6 6"/></svg>',
  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M24 5l16 12-6 22H14L8 17 24 5z"/><path d="M8 17h32M17 17l7 22 7-22"/></svg>',
  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h12v10l8 14c2 4-1 8-5 8H15c-4 0-7-4-5-8l8-14V8z"/><path d="M17 29h14"/></svg>',
  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18h20c5 0 8 4 8 9s-3 9-8 9H14c-5 0-8-4-8-9s3-9 8-9z"/><path d="M16 24v8M12 28h8M31 26h.1M36 31h.1"/></svg>',
  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="15"/><path d="M24 13v22M17 18c3-3 11-3 14 0M17 30c3 3 11 3 14 0"/></svg>',
  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8l24 16-11 3-5 11-8-30z"/><path d="M25 27l9 9"/></svg>',
  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 34l20-20"/><path d="M30 10l8-4-4 8 4 8-8-4-8 4 4-8-4-8 8 4z"/><path d="M10 38l-2 6M16 40l3 5M7 32l-5 2"/></svg>'
];

atmosphereSections.forEach((section, sectionIndex) => {
  section.classList.add("creator-atmosphere");

  if (section.querySelector(":scope > .creator-particles")) return;

  const layer = document.createElement("div");
  layer.className = "creator-particles";
  layer.setAttribute("aria-hidden", "true");

  creatorStickers.forEach((sticker, markIndex) => {
    const particle = document.createElement("span");
    particle.innerHTML = sticker;
    particle.style.setProperty("--particle-x", `${8 + ((markIndex * 19 + sectionIndex * 11) % 84)}%`);
    particle.style.setProperty("--particle-y", `${10 + ((markIndex * 23 + sectionIndex * 17) % 76)}%`);
    particle.style.setProperty("--particle-delay", `${-1 * ((markIndex + sectionIndex) % 6)}s`);
    particle.style.setProperty("--particle-drift", `${34 + ((markIndex + sectionIndex) % 5) * 9}px`);
    layer.appendChild(particle);
  });

  section.prepend(layer);
});

function animateCounter(element) {
  if (element.dataset.counted === "true") return;

  element.dataset.counted = "true";
  const target = Number(element.dataset.count);
  const suffix = element.dataset.suffix || "";
  const duration = 950;
  const start = performance.now();

  function render(time) {
    const progress = Math.min((time - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = target * eased;

    if (suffix === "h") {
      const hours = Math.floor(value);
      const minutes = Math.round((value - hours) * 60);
      element.textContent = progress === 1 ? "4h 30m" : `${hours}h ${minutes}m`;
    } else {
      element.textContent = Math.round(value).toString();
    }

    if (progress < 1) {
      requestAnimationFrame(render);
    }
  }

  requestAnimationFrame(render);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

if (reduceMotion || !("IntersectionObserver" in window)) {
  animatedItems.forEach((item) => item.classList.add("is-visible"));
  document.querySelectorAll(".count-up").forEach((item) => {
    item.textContent = item.dataset.suffix === "h" ? "4h 30m" : item.dataset.count;
  });
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const target = entry.target;
        target.classList.add("is-visible");
        target.querySelectorAll(".count-up").forEach(animateCounter);
        observer.unobserve(target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  animatedItems.forEach((item) => observer.observe(item));
}
