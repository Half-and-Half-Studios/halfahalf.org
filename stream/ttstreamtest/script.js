/* ---------- Elements ---------- */
const canvas = document.getElementById("circuit");
const ctx = canvas.getContext("2d");
const ringEl = document.getElementById("ring");
const clockEl = document.getElementById("clock");
const keyEls = Array.from(document.querySelectorAll("#keys i"));

const pad = (n, len = 2) => String(n).padStart(len, "0");

/* ---------- 44-LED ring ---------- */
const LED_COUNT = 44;
const leds = [];

for (let i = 0; i < LED_COUNT; i++) {
  const el = document.createElement("div");
  el.className = "led" + (i % 2 === 0 ? " big" : "");
  el.style.setProperty("--a", (i * 360 / LED_COUNT) + "deg");
  ringEl.appendChild(el);
  leds.push(el);
}

function updateLeds(t) {
  const head = (t * 0.012) % LED_COUNT; // chase speed
  const tail = 12;
  for (let i = 0; i < LED_COUNT; i++) {
    let dist = head - i;
    if (dist < 0) dist += LED_COUNT;
    const b = dist < tail ? Math.pow(1 - dist / tail, 1.6) : 0;
    leds[i].style.setProperty("--b", b.toFixed(3));
  }
}

/* ---------- Deck key indicators ---------- */
let activeKey = 0;
setInterval(() => {
  keyEls.forEach((k, i) => k.classList.toggle("on", i === activeKey));
  activeKey = (activeKey + 1) % keyEls.length;
}, 450);

/* ---------- Circuit network ---------- */
const GRID = 80;
let W, H, dpr, nodes, edges, base, pulses;

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function buildCircuit() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cols = Math.ceil(W / GRID) + 1;
  const rows = Math.ceil(H / GRID) + 1;
  const map = {};
  nodes = [];
  edges = [];

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (Math.random() < 0.75) {
        const n = { x: c * GRID, y: r * GRID, c, r, n: [] };
        map[c + "," + r] = n;
        nodes.push(n);
      }
    }
  }

  function link(a, b) {
    if (!a || !b) return;
    a.n.push(b);
    b.n.push(a);
    edges.push([a, b]);
  }

  nodes.forEach((n) => {
    if (Math.random() < 0.55) link(n, map[(n.c + 1) + "," + n.r]);
    if (Math.random() < 0.55) link(n, map[n.c + "," + (n.r + 1)]);
    if (Math.random() < 0.1) link(n, map[(n.c + 1) + "," + (n.r + 1)]);
  });

  // Pre-render static traces and pads
  base = document.createElement("canvas");
  base.width = W * dpr;
  base.height = H * dpr;
  const b = base.getContext("2d");
  b.setTransform(dpr, 0, 0, dpr, 0, 0);

  b.lineCap = "round";
  b.strokeStyle = "rgba(31, 122, 74, 0.55)";
  b.lineWidth = 2.5;
  edges.forEach(([p, q]) => {
    b.beginPath();
    b.moveTo(p.x, p.y);
    b.lineTo(q.x, q.y);
    b.stroke();
  });

  nodes.forEach((n) => {
    if (n.n.length === 0) return;
    b.beginPath();
    b.arc(n.x, n.y, 5, 0, Math.PI * 2);
    b.fillStyle = "#0d2a1b";
    b.fill();
    b.strokeStyle = "rgba(93, 255, 154, 0.35)";
    b.lineWidth = 1.5;
    b.stroke();
    b.beginPath();
    b.arc(n.x, n.y, 1.8, 0, Math.PI * 2);
    b.fillStyle = "rgba(93, 255, 154, 0.5)";
    b.fill();
  });

  // Pulses
  const connected = nodes.filter((n) => n.n.length > 0);
  const count = Math.max(10, Math.round(connected.length / 14));
  pulses = [];
  for (let i = 0; i < count; i++) {
    const from = connected[Math.floor(Math.random() * connected.length)];
    const to = from.n[Math.floor(Math.random() * from.n.length)];
    pulses.push({ from, to, t: Math.random(), speed: rand(120, 260) });
  }
}

function updatePulses(dt) {
  pulses.forEach((p) => {
    const len = Math.hypot(p.to.x - p.from.x, p.to.y - p.from.y);
    p.t += (p.speed * dt) / len;
    if (p.t >= 1) {
      const prev = p.from;
      p.from = p.to;
      const options = p.from.n.filter((n) => n !== prev);
      p.to = options.length
        ? options[Math.floor(Math.random() * options.length)]
        : prev;
      p.t = 0;
    }
  });
}

function drawCircuit() {
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(base, 0, 0, W, H);

  pulses.forEach((p) => {
    const x = p.from.x + (p.to.x - p.from.x) * p.t;
    const y = p.from.y + (p.to.y - p.from.y) * p.t;

    // Short trail
    const tx = p.from.x + (p.to.x - p.from.x) * Math.max(0, p.t - 0.25);
    const ty = p.from.y + (p.to.y - p.from.y) * Math.max(0, p.t - 0.25);
    const grad = ctx.createLinearGradient(tx, ty, x, y);
    grad.addColorStop(0, "rgba(93, 255, 154, 0)");
    grad.addColorStop(1, "rgba(93, 255, 154, 0.9)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#b5ffd2";
    ctx.fill();
  });
}

/* ---------- Main loop ---------- */
let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  const d = new Date();
  clockEl.textContent =
    pad(d.getHours()) + ":" +
    pad(d.getMinutes()) + ":" +
    pad(d.getSeconds()) + "." +
    pad(d.getMilliseconds(), 3);

  updateLeds(now);
  updatePulses(dt);
  drawCircuit();

  requestAnimationFrame(frame);
}

/* ---------- Fullscreen ---------- */
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

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(buildCircuit, 150);
});

/* ---------- Start ---------- */
buildCircuit();
requestAnimationFrame(frame);
