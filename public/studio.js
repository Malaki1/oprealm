async function loadStudioAccount() {
  const createLink = document.querySelector(".launcher-header .button-primary");
  try {
    const response = await fetch("/api/account", { cache: "no-store" });
    const data = await response.json();
    if (data?.authenticated && createLink) {
      createLink.textContent = "Create";
      createLink.href = "#creationLauncher";
    }
  } catch {
    // The launcher still works without account metadata.
  }
}

function addLauncherMotion() {
  const cards = [...document.querySelectorAll(".creation-card")];
  cards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * -10;
      card.style.setProperty("--tilt-x", `${y.toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${x.toFixed(2)}deg`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.removeProperty("--tilt-x");
      card.style.removeProperty("--tilt-y");
    });
  });
}

loadStudioAccount();
addLauncherMotion();
