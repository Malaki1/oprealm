const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const animatedItems = document.querySelectorAll(
  ".reveal, .reveal-section, .platform-panel, .hero-strip"
);
const glintItems = document.querySelectorAll(
  ".path-card, .module-grid article, .unlock-card, .safety-grid article, .chat-card, .project-grid article, .dashboard-card, .pricing-card, .membership-card"
);

glintItems.forEach((item) => {
  item.classList.add("glass-glint-ready");

  if (!item.querySelector(":scope > .glass-edge-glint")) {
    const glint = document.createElement("span");
    glint.className = "glass-edge-glint";
    glint.setAttribute("aria-hidden", "true");
    item.appendChild(glint);
  }
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

if (reduceMotion || !("IntersectionObserver" in window)) {
  animatedItems.forEach((item) => item.classList.add("is-visible"));
  glintItems.forEach((item) => item.classList.add("glint-complete"));
  document.querySelectorAll(".count-up").forEach((item) => {
    item.textContent = item.dataset.suffix === "h" ? "4h 30m" : item.dataset.count;
  });
} else {
  const glintObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-glinting");
        window.setTimeout(() => entry.target.classList.add("glint-complete"), 1800);
        glintObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.32,
      rootMargin: "0px 0px -12% 0px"
    }
  );

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
  glintItems.forEach((item) => glintObserver.observe(item));
}
