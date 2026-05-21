async function updateAccountNavigation() {
  const accountLinks = document.querySelectorAll("[data-account-link]");
  if (!accountLinks.length) return;

  try {
    const response = await fetch("/api/account", {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const data = await response.json();
    if (!data.authenticated) return;

    accountLinks.forEach((link) => {
      link.href = "/account.html";
      link.textContent = "My Account";
      link.setAttribute("aria-label", `My Account${data.user?.displayName ? ` for ${data.user.displayName}` : ""}`);
    });
  } catch {
    accountLinks.forEach((link) => {
      link.href = "/login.html";
      link.textContent = "Log In";
    });
  }
}

updateAccountNavigation();
