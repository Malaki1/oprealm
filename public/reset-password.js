const resetPasswordForm = document.querySelector("#resetPasswordForm");
const resetPasswordStatus = document.querySelector("#resetPasswordStatus");
const token = new URLSearchParams(location.search).get("token") || new URLSearchParams(location.search).get("reset");

if (!token) {
  resetPasswordStatus.textContent = "This reset link is missing a secure token. Request a new reset email.";
}

resetPasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetPasswordStatus.textContent = "Updating password...";

  try {
    const response = await fetch("/api/account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "reset_password",
        token,
        password: new FormData(resetPasswordForm).get("password"),
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Could not update password.");
    resetPasswordStatus.textContent = "Password updated. You can now log in.";
  } catch (error) {
    resetPasswordStatus.textContent = error.message;
  }
});
