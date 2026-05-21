const billingStatus = document.querySelector("#billingStatus");

async function loadBillingAccount() {
  try {
    const response = await fetch("/api/account");
    const data = await response.json();
    if (!data.authenticated) {
      billingStatus.textContent = "Log in or create an account before choosing a membership.";
      return;
    }
    billingStatus.textContent = `Signed in as ${data.user.displayName}. Current tier: ${formatTier(data.user.tier)}.`;
  } catch {
    billingStatus.textContent = "Account status could not be checked yet.";
  }
}

function formatTier(tier) {
  return {
    explorer: "Explorer Pass",
    creator: "Creator Membership",
    pro: "Creator Pro",
    elite: "Elite Creator",
    intensive: "Elite Creator",
  }[tier] || "Explorer Pass";
}

async function startCheckout(provider, tier) {
  billingStatus.textContent = provider === "stripe" ? "Creating secure card checkout..." : "Creating PayPal order...";

  const response = await fetch("/api/payments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider, tier }),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || "Could not create checkout.");

  if (data.checkoutUrl) {
    location.href = data.checkoutUrl;
    return;
  }

  if (data.approveUrl) {
    location.href = data.approveUrl;
    return;
  }

  billingStatus.textContent = `Created ${provider} checkout reference: ${data.orderId || "ready"}`;
}

async function startCreditCheckout(provider, bundle) {
  billingStatus.textContent = "Creating secure credit checkout...";

  const response = await fetch("/api/payments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider, bundle }),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || "Could not create credit checkout.");

  if (data.checkoutUrl) {
    location.href = data.checkoutUrl;
    return;
  }

  billingStatus.textContent = "Credit checkout is ready.";
}

document.querySelectorAll("[data-provider][data-tier]").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await startCheckout(button.dataset.provider, button.dataset.tier);
    } catch (error) {
      billingStatus.textContent = error.message;
    }
  });
});

document.querySelectorAll("[data-provider][data-bundle]").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await startCreditCheckout(button.dataset.provider, button.dataset.bundle);
    } catch (error) {
      billingStatus.textContent = error.message;
    }
  });
});

const params = new URLSearchParams(location.search);
if (params.get("checkout") === "success") {
  billingStatus.textContent = "Checkout completed. Your membership will update after payment confirmation is processed.";
}
if (params.get("checkout") === "cancelled") {
  billingStatus.textContent = "Checkout was cancelled. No payment was taken.";
}
if (params.get("credits") === "success") {
  billingStatus.textContent = "Credit top-up completed. Your Creator credits will update shortly.";
}
if (params.get("credits") === "cancelled") {
  billingStatus.textContent = "Credit top-up checkout was cancelled. No payment was taken.";
}

if (params.get("paypal") === "approved" && params.get("token")) {
  billingStatus.textContent = "Capturing PayPal payment...";
  fetch("/api/payments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "capture_paypal", orderId: params.get("token") }),
  })
    .then((response) => response.json().then((data) => ({ response, data })))
    .then(({ response, data }) => {
      if (!response.ok || !data.ok) throw new Error(data.error || "PayPal capture failed.");
      billingStatus.textContent = "PayPal payment captured. Your membership has been updated.";
    })
    .catch((error) => {
      billingStatus.textContent = error.message;
    });
}

if (params.get("paypal") === "cancelled") {
  billingStatus.textContent = "PayPal checkout was cancelled. No payment was taken.";
}

if (!location.search) {
  loadBillingAccount();
}
