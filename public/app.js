const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const animatedItems = document.querySelectorAll(
  ".reveal, .reveal-section, .platform-panel, .hero-strip"
);
let lastScrollY = window.scrollY;
let scrollDirection = 1;
let circuitFrame = 0;

function createCircuitRail() {
  const rail = document.createElement("div");
  rail.className = "circuit-scroll-rail";
  rail.setAttribute("aria-hidden", "true");
  rail.innerHTML = `
    <svg class="circuit-map" viewBox="0 0 120 720" preserveAspectRatio="none" focusable="false">
      <path class="circuit-path circuit-path-base" d="M96 0 V86 C96 124 36 120 36 164 V226 C36 268 96 252 96 310 V386 C96 436 28 424 28 478 V548 C28 604 96 590 96 650 V720" />
      <path class="circuit-path circuit-path-energy" d="M96 0 V86 C96 124 36 120 36 164 V226 C36 268 96 252 96 310 V386 C96 436 28 424 28 478 V548 C28 604 96 590 96 650 V720" />
      <path class="circuit-branch-line" d="M36 180 H14 M96 330 H116 M28 502 H8 M96 632 H116" />
      <circle class="circuit-node node-a" cx="36" cy="180" r="5" />
      <circle class="circuit-node node-b" cx="96" cy="330" r="5" />
      <circle class="circuit-node node-c" cx="28" cy="502" r="5" />
      <circle class="circuit-node node-d" cx="96" cy="632" r="5" />
    </svg>
    <span class="circuit-electron"><span></span></span>
  `;
  document.body.appendChild(rail);
  return rail;
}

const circuitRail = reduceMotion ? null : createCircuitRail();

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

function updateCircuitRail() {
  circuitFrame = 0;
  if (!circuitRail) return;

  const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const progress = clamp(window.scrollY / scrollable, 0, 1);
  const eased = 1 - Math.pow(1 - progress, 1.35);
  const path = circuitRail.querySelector(".circuit-path-base");
  const electron = circuitRail.querySelector(".circuit-electron");

  if (path && electron) {
    const length = path.getTotalLength();
    const point = path.getPointAtLength(length * eased);

    electron.style.left = `${point.x / 120 * 100}%`;
    electron.style.top = `${point.y / 720 * 100}%`;
    circuitRail.style.setProperty("--circuit-dash", `${length}`);
    circuitRail.style.setProperty("--circuit-offset", `${length * (1 - eased)}`);
  }

  circuitRail.style.setProperty("--circuit-progress", progress.toFixed(4));
  circuitRail.classList.toggle("scrolling-up", scrollDirection < 0);
}

function requestCircuitUpdate() {
  if (circuitFrame) return;
  circuitFrame = window.requestAnimationFrame(updateCircuitRail);
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

  window.addEventListener(
    "scroll",
    () => {
      const currentScrollY = window.scrollY;
      scrollDirection = currentScrollY >= lastScrollY ? 1 : -1;
      lastScrollY = currentScrollY;
      requestCircuitUpdate();
    },
    { passive: true }
  );

  window.addEventListener("resize", requestCircuitUpdate);
  requestCircuitUpdate();
}
