const body = document.body;
const swipeLeftTarget = body?.dataset?.swipeLeft;
const swipeRightTarget = body?.dataset?.swipeRight;

if (swipeLeftTarget || swipeRightTarget) {
  let startX = 0;
  let startY = 0;
  let startTime = 0;

  function onTouchStart(event) {
    const touch = event.changedTouches[0];
    startX = touch.pageX;
    startY = touch.pageY;
    startTime = Date.now();
  }

  function onTouchEnd(event) {
    const touch = event.changedTouches[0];
    const distX = touch.pageX - startX;
    const distY = touch.pageY - startY;
    const elapsed = Date.now() - startTime;

    const threshold = 60; // px needed for swipe
    const restraint = 80; // max vertical delta
    const allowedTime = 600; // ms

    if (elapsed > allowedTime) return;
    if (Math.abs(distY) > restraint) return;

    if (distX <= -threshold && swipeLeftTarget) {
      window.location.href = swipeLeftTarget;
    } else if (distX >= threshold && swipeRightTarget) {
      window.location.href = swipeRightTarget;
    }
  }

  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("touchend", onTouchEnd, { passive: true });
}
