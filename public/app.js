const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const animatedItems = document.querySelectorAll(
  ".reveal, .reveal-section, .platform-panel, .hero-strip"
);
const atmosphereSections = document.querySelectorAll(
  ".path-section, .curriculum-section, .coach-section, .dashboard-section, .pricing-section, .faq-section"
);
const creatorMarks = ["AI", "LUA", "{ }", "RGB", "SFX", "PNG", "</>", "3D"];

atmosphereSections.forEach((section, sectionIndex) => {
  section.classList.add("creator-atmosphere");

  if (section.querySelector(":scope > .creator-particles")) return;

  const layer = document.createElement("div");
  layer.className = "creator-particles";
  layer.setAttribute("aria-hidden", "true");

  creatorMarks.forEach((mark, markIndex) => {
    const particle = document.createElement("span");
    particle.textContent = mark;
    particle.style.setProperty("--particle-x", `${8 + ((markIndex * 19 + sectionIndex * 11) % 84)}%`);
    particle.style.setProperty("--particle-y", `${10 + ((markIndex * 23 + sectionIndex * 17) % 76)}%`);
    particle.style.setProperty("--particle-delay", `${-1 * ((markIndex + sectionIndex) % 6)}s`);
    particle.style.setProperty("--particle-drift", `${18 + ((markIndex + sectionIndex) % 5) * 5}px`);
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
