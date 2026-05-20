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
    <span class="circuit-track"></span>
    <span class="circuit-branch branch-top"></span>
    <span class="circuit-branch branch-mid"></span>
    <span class="circuit-branch branch-bottom"></span>
    <span class="circuit-node node-top"></span>
    <span class="circuit-node node-mid"></span>
    <span class="circuit-node node-bottom"></span>
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

  circuitRail.style.setProperty("--electron-y", `${eased * 100}%`);
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
