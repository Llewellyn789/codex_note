const toastEl = document.getElementById("toast");
let hideTimer;

export function showToast(message, duration = 2800) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, duration);
}
