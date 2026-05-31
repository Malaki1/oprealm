const billingButtons = [...document.querySelectorAll("[data-billing-toggle]")];
const planCards = [...document.querySelectorAll("[data-plan-card]")];

function setBillingMode(mode) {
  const isYearly = mode === "yearly";

  billingButtons.forEach((button) => {
    const active = button.dataset.billingToggle === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  planCards.forEach((card) => {
    const priceValue = card.querySelector("[data-price-value]");
    const priceLabel = card.querySelector("[data-price-label]");
    const planNote = card.querySelector("[data-plan-note]");
    const cta = card.querySelector("[data-plan-cta]");

    if (priceValue) priceValue.textContent = isYearly ? card.dataset.yearlyPrice : card.dataset.monthlyPrice;
    if (priceLabel) priceLabel.textContent = isYearly ? card.dataset.yearlyLabel : card.dataset.monthlyLabel;
    if (planNote) planNote.textContent = isYearly ? card.dataset.yearlyNote : defaultPlanNote(card);
    if (cta) cta.textContent = isYearly ? "Claim 30% Yearly Savings" : defaultPlanCta(card);

    card.classList.toggle("is-yearly", isYearly);
  });
}

function defaultPlanNote(card) {
  return card.querySelector("p")?.textContent?.includes("Elite")
    ? "For the next generation"
    : "Unlimited creativity";
}

function defaultPlanCta(card) {
  return card.querySelector("p")?.textContent?.includes("Elite") ? "Start Elite" : "Start Creator";
}

billingButtons.forEach((button) => {
  button.addEventListener("click", () => setBillingMode(button.dataset.billingToggle || "monthly"));
});
