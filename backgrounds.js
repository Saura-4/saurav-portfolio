/* Hero background: starfield.
   Interface: factory(canvas, api) -> { resize(), tick(now) }
   - api.getColors() -> { c1: "r,g,b", c2: "r,g,b" }  accent colors (live)
   - api.getMouse()  -> { x, y, over }                 cursor in canvas coords
   The engine (script.js) sizes the canvas, drives tick(), handles resize/visibility. */

window.BACKGROUNDS = window.BACKGROUNDS || {};

window.BACKGROUNDS.starfield = function (canvas, api) {
  const ctx = canvas.getContext("2d");

  let stars = [];
  let orbs = [];
  const shooters = [];
  let nextSpawnAt = null; // absolute ms time of the next shooting star
  let lastNow = null;
  let parX = 0; // smoothed cursor parallax, roughly -1..1
  let parY = 0;

  function rnd(a, b) {
    return a + Math.random() * (b - a);
  }

  function rgba(triplet, a) {
    return "rgba(" + triplet + "," + a + ")";
  }

  // Star field: N scales with area (≈93 stars at 1200x700).
  function initStars() {
    const w = canvas.width;
    const h = canvas.height;
    const n = Math.min(160, Math.floor((w * h) / 9000));
    stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z: rnd(0.25, 1), // depth, 1 = near
        phase: Math.random() * Math.PI * 2,
        sp: rnd(0.6, 1.8), // twinkle speed multiplier
        alt: Math.random() < 0.15 // ~15% shine in the second accent color
      });
    }
  }

  // Two distant-planet glows on slow lissajous-style drift paths.
  function initOrbs() {
    const w = canvas.width;
    const h = canvas.height;
    const m = Math.min(w, h);
    orbs = [
      { ax: rnd(0.18, 0.30) * w, ay: rnd(0.14, 0.24) * h,
        wx: rnd(0.00004, 0.00009), wy: rnd(0.00003, 0.00007), // rad/ms, very slow
        px: Math.random() * Math.PI * 2, py: Math.random() * Math.PI * 2,
        r: rnd(0.030, 0.035) * m },
      { ax: rnd(0.18, 0.30) * w, ay: rnd(0.14, 0.24) * h,
        wx: rnd(0.00004, 0.00009), wy: rnd(0.00003, 0.00007),
        px: Math.random() * Math.PI * 2, py: Math.random() * Math.PI * 2,
        r: rnd(0.035, 0.040) * m }
    ];
  }

  function resize() {
    initStars();
    initOrbs();
    shooters.length = 0;
    lastNow = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  resize();

  function spawnShooter(now, w, h) {
    // Speed scale relative to canvas so streaks cross sensibly at any size.
    const scale = Math.min(1.5, Math.max(0.35, Math.min(w, h) / 640));
    const inv = 1 / Math.sqrt(1 + 0.35 * 0.35); // normalize (1, 0.35)
    shooters.push({
      x: rnd(0.05, 0.7) * w,
      y: rnd(0.04, 0.3) * h, // random point in the top third
      nx: inv,
      ny: 0.35 * inv,
      v: 0.5 * scale, // px per ms
      born: now,
      life: 900,
      len: 0.12 * w // tail length ~12% of canvas width
    });
  }

  function drawOrbs(now, w, h, c2) {
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i];
      const cx = w * 0.5 + Math.sin(now * o.wx + o.px) * o.ax;
      const cy = h * 0.45 + Math.cos(now * o.wy + o.py) * o.ay;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, o.r);
      grad.addColorStop(0, rgba(c2, 0.12));
      grad.addColorStop(0.55, rgba(c2, 0.05));
      grad.addColorStop(1, rgba(c2, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, o.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawShooters(now, dt, c2) {
    for (let i = shooters.length - 1; i >= 0; i--) {
      const s = shooters[i];
      const t = (now - s.born) / s.life;
      if (t >= 1 || t < 0) {
        shooters.splice(i, 1);
        continue;
      }
      s.x += s.nx * s.v * dt;
      s.y += s.ny * s.v * dt;

      // Alpha envelope: quick fade-in over the first 18%, out over the last 35%.
      const env = Math.min(1, t / 0.18) * Math.min(1, (1 - t) / 0.35);
      const headA = (0.9 * env).toFixed(3); // peak ~0.9, brief
      const tailX = s.x - s.nx * s.len;
      const tailY = s.y - s.ny * s.len;

      const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
      grad.addColorStop(0, rgba(c2, headA));
      grad.addColorStop(1, rgba(c2, 0));
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(1, s.len * 0.016);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      // Small bright head dot.
      ctx.fillStyle = rgba(c2, headA);
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(1.1, s.len * 0.026), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return {
    resize,

    tick(now) {
      const w = canvas.width;
      const h = canvas.height;
      const colors = api.getColors();
      const c1 = colors.c1;
      const c2 = colors.c2;

      if (lastNow === null) lastNow = now;
      let dt = now - lastNow;
      if (dt < 0) dt = 0;
      if (dt > 50) dt = 50; // avoid jumps after long pauses
      lastNow = now;
      const f = dt / 16.667; // frame factor, ~1 at 60fps

      // Subtle cursor parallax (optional API).
      const m = typeof api.getMouse === "function" ? api.getMouse() : null;
      const tx = m && m.over ? (m.x / w - 0.5) * 2 : 0;
      const ty = m && m.over ? (m.y / h - 0.5) * 2 : 0;
      const k = Math.min(1, 0.06 * f);
      parX += (tx - parX) * k;
      parY += (ty - parY) * k;

      ctx.clearRect(0, 0, w, h);

      drawOrbs(now, w, h, c2);

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const drift = 0.02 + s.z * 0.05; // px/frame, leftward
        s.x -= drift * f;
        s.y -= drift * 0.45 * f; // up-left diagonal
        if (s.x < -4) s.x += w + 8;
        else if (s.x > w + 4) s.x -= w + 8;
        if (s.y < -4) s.y += h + 8;
        else if (s.y > h + 4) s.y -= h + 8;

        // Twinkle; the 0.7 factor keeps peak alpha at ~0.35 for near stars.
        const tw = 0.5 + 0.5 * Math.sin(now * 0.001 * s.sp + s.phase);
        const a = (0.15 + 0.35 * tw) * s.z * 0.7;
        const ox = -parX * 9 * s.z;
        const oy = -parY * 7 * s.z;

        ctx.fillStyle = rgba(s.alt ? c2 : c1, a.toFixed(3));
        ctx.beginPath();
        ctx.arc(s.x + ox, s.y + oy, 0.6 + s.z * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shooting stars: first ~3s after start, then every 6-14s.
      if (nextSpawnAt === null) {
        nextSpawnAt = now + 3000;
      } else if (now >= nextSpawnAt && shooters.length === 0) {
        spawnShooter(now, w, h);
        nextSpawnAt = now + 6000 + Math.random() * 8000;
      }
      drawShooters(now, dt, c2);
    }
  };
};
