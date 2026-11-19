const clockEl = document.getElementById("clock");
const fpsEl = document.getElementById("fps");
const resEl = document.getElementById("res");

const pad = (n, len = 2) => String(n).padStart(len, "0");

let frames = 0;
let lastFpsTime = performance.now();

function tick(now) {
  // Clock with milliseconds
  const d = new Date();
  clockEl.textContent =
    pad(d.getHours()) + ":" +
    pad(d.getMinutes()) + ":" +
    pad(d.getSeconds()) + "." +
    pad(d.getMilliseconds(), 3);

  // FPS counter
  frames++;
  if (now - lastFpsTime >= 1000) {
    fpsEl.textContent = "FPS: " + Math.round((frames * 1000) / (now - lastFpsTime));
    frames = 0;
    lastFpsTime = now;
  }

  requestAnimationFrame(tick);
}

function updateResolution() {
  resEl.textContent = window.innerWidth + " x " + window.innerHeight;
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener("click", toggleFullscreen);

document.addEventListener("keydown", (e) => {
  if (e.key === "f" || e.key === "F") toggleFullscreen();
});

document.addEventListener("fullscreenchange", () => {
  document.body.classList.toggle("fullscreen", !!document.fullscreenElement);
});

window.addEventListener("resize", updateResolution);

updateResolution();
requestAnimationFrame(tick);
