const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const animatedItems = document.querySelectorAll(
  ".reveal, .reveal-section, .platform-panel, .hero-strip"
);
const glintItems = document.querySelectorAll(
  ".path-card, .module-grid article, .unlock-card, .safety-grid article, .chat-card, .project-grid article, .dashboard-card, .pricing-card, .membership-card"
);
const activeGlintItems = new Set();
let lastScrollY = window.scrollY;
let scrollDirection = 1;
let glintFrame = 0;

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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateScrollGlints() {
  glintFrame = 0;

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

  activeGlintItems.forEach((item) => {
    const rect = item.getBoundingClientRect();
    const progress = clamp((viewportHeight - rect.top) / (viewportHeight + rect.height), 0, 1);
    const centerDistance = Math.abs(rect.top + rect.height / 2 - viewportHeight / 2);
    const proximity = 1 - clamp(centerDistance / (viewportHeight * 0.62), 0, 1);
    const opacity = clamp(0.18 + proximity * 0.82, 0, 1);
    const diagonal = scrollDirection >= 0 ? progress : 1 - progress;
    const cross = 1 - Math.abs(progress - 0.5) * 2;

    item.style.setProperty("--glint-x", `${-44 + diagonal * 88}%`);
    item.style.setProperty("--glint-y", `${-38 + progress * 76}%`);
    item.style.setProperty("--glint-bg-x", `${diagonal * 100}%`);
    item.style.setProperty("--glint-bg-y", `${progress * 100}%`);
    item.style.setProperty("--glint-opacity", (opacity * (0.38 + cross * 0.62)).toFixed(3));
  });
}

function requestGlintUpdate() {
  if (glintFrame) return;
  glintFrame = window.requestAnimationFrame(updateScrollGlints);
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
        if (entry.isIntersecting) {
          entry.target.classList.add("is-glinting");
          activeGlintItems.add(entry.target);
        } else {
          entry.target.classList.remove("is-glinting");
          activeGlintItems.delete(entry.target);
        }
      });

      requestGlintUpdate();
    },
    {
      threshold: 0,
      rootMargin: "18% 0px 18% 0px"
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

  window.addEventListener(
    "scroll",
    () => {
      const currentScrollY = window.scrollY;
      scrollDirection = currentScrollY >= lastScrollY ? 1 : -1;
      lastScrollY = currentScrollY;
      requestGlintUpdate();
    },
    { passive: true }
  );

  window.addEventListener("resize", requestGlintUpdate);
  requestGlintUpdate();
}
