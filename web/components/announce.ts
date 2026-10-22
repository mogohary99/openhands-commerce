// Speaks a message through the app's single polite live region (mounted in the root layout).
// The region is cleared first so the same message can be announced twice in a row.
export function announce(message: string) {
  const region = document.getElementById("sr-status");
  if (!region) return;
  region.textContent = "";
  window.setTimeout(() => {
    region.textContent = message;
  }, 60);
}
