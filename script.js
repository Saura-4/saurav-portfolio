const nav = document.querySelector(".nav");
const navLinks = document.getElementById("navLinks");
const menuBtn = document.getElementById("menuBtn");
const sections = document.querySelectorAll("section[id]");
const links = document.querySelectorAll(".nav-links a");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

menuBtn.addEventListener("click", () => {
  menuBtn.classList.toggle("open");
  navLinks.classList.toggle("open");
});

links.forEach((link) =>
  link.addEventListener("click", () => {
    menuBtn.classList.remove("open");
    navLinks.classList.remove("open");
  })
);

window.addEventListener(
  "scroll",
  () => {
    nav.classList.toggle("scrolled", window.scrollY > 10);

    let current = "";
    sections.forEach((section) => {
      if (window.scrollY >= section.offsetTop - 140) current = section.id;
    });

    links.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${current}`);
    });
  },
  { passive: true }
);

document.querySelectorAll("[data-stagger]").forEach((group) => {
  [...group.querySelectorAll(".reveal")].forEach((el, i) => {
    el.dataset.delay = i * 70;
  });
});

if (reducedMotion) {
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          setTimeout(() => el.classList.add("visible"), Number(el.dataset.delay || 0));
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

document.getElementById("year").textContent = new Date().getFullYear();

/* ================= Scroll progress bar ================= */

const progressBar = document.getElementById("progressBar");

window.addEventListener(
  "scroll",
  () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = `${(window.scrollY / max) * 100}%`;
  },
  { passive: true }
);

/* ================= Hero background: starfield ================= */

const heroCanvas = document.getElementById("particles");
const heroEl = heroCanvas.parentElement;

const engine = {
  colors: { c1: "232,232,232", c2: "163,163,163" },
  mouse: { x: 0, y: 0, over: false },
  instance: null,
  raf: 0
};

const bgApi = {
  getColors: () => engine.colors,
  getMouse: () => engine.mouse
};

function readEngineColors() {
  const cs = getComputedStyle(document.documentElement);
  engine.colors.c1 = cs.getPropertyValue("--accent-rgb").trim() || "232,232,232";
  engine.colors.c2 = cs.getPropertyValue("--accent-2-rgb").trim() || "163,163,163";
}

function sizeHeroCanvas() {
  heroCanvas.width = heroEl.offsetWidth;
  heroCanvas.height = heroEl.offsetHeight;
}

function bgLoop(now) {
  try {
    if (engine.instance) engine.instance.tick(now);
  } catch (e) {
    engine.instance = null;
    return;
  }
  engine.raf = requestAnimationFrame(bgLoop);
}

function startBackground() {
  cancelAnimationFrame(engine.raf);
  const factory = window.BACKGROUNDS && window.BACKGROUNDS.starfield;
  if (!factory) return;
  sizeHeroCanvas();
  readEngineColors();
  engine.instance = factory(heroCanvas, bgApi);
  if (reducedMotion) {
    engine.instance.tick(0);
    return;
  }
  engine.raf = requestAnimationFrame(bgLoop);
}

heroEl.addEventListener("mousemove", (e) => {
  const r = heroCanvas.getBoundingClientRect();
  engine.mouse.x = e.clientX - r.left;
  engine.mouse.y = e.clientY - r.top;
  engine.mouse.over = true;
});
heroEl.addEventListener("mouseleave", () => { engine.mouse.over = false; });

window.addEventListener("resize", () => {
  sizeHeroCanvas();
  if (engine.instance && engine.instance.resize) engine.instance.resize();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) cancelAnimationFrame(engine.raf);
  else if (!reducedMotion && engine.instance) {
    cancelAnimationFrame(engine.raf);
    engine.raf = requestAnimationFrame(bgLoop);
  }
});

startBackground();

/* ================= Typewriter ================= */

const typed = document.getElementById("typed");

if (typed && !reducedMotion) {
  const phrases = ["systems that ship.", "RAG pipelines.", "LLM backends.", "browser extensions.", "eval frameworks."];
  let pi = 0, ci = 0, deleting = false;

  (function type() {
    const word = phrases[pi];
    typed.textContent = word.slice(0, ci);

    let delay = deleting ? 38 : 72;
    if (!deleting && ci === word.length) { delay = 1900; deleting = true; }
    else if (deleting && ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; delay = 350; }
    else ci += deleting ? -1 : 1;

    setTimeout(type, delay);
  })();
} else if (typed) {
  typed.textContent = "systems that ship.";
}

/* ================= Count-up stats ================= */

const counters = document.querySelectorAll("[data-count]");

if (counters.length && !reducedMotion) {
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        counterObserver.unobserve(el);
        const target = parseFloat(el.dataset.count);
        const decimals = Number(el.dataset.decimals || 0);
        const suffix = el.dataset.suffix || "";
        const dur = 1600;
        const t0 = performance.now();

        (function step(t) {
          const p = Math.min((t - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * eased).toFixed(decimals) + (p === 1 ? suffix : "");
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => counterObserver.observe(el));
} else {
  counters.forEach((el) => {
    el.textContent = el.dataset.count + (el.dataset.suffix || "");
  });
}

/* ================= 3D tilt on cards ================= */

if (!reducedMotion && window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".project-card, .project-featured, .skill-card").forEach((card) => {
    card.classList.add("tilt");
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg) translateY(-4px)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

/* ================= Spotlight on cards ================= */

if (window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".box, .project-card, .project-featured, .skill-card, .contact-panel").forEach((card) => {
    card.classList.add("spotlight");
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
}

/* ================= Magnetic primary buttons ================= */

if (!reducedMotion && window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".btn-primary").forEach((btn) => {
    btn.classList.add("btn-magnetic");
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.28}px)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "";
    });
  });
}

/* ================= Parallax blobs ================= */

const blobs = document.querySelectorAll(".blob");

if (blobs.length && !reducedMotion) {
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      blobs[0].style.transform = `translateY(${y * 0.08}px)`;
      if (blobs[1]) blobs[1].style.transform = `translateY(${y * -0.06}px)`;
    },
    { passive: true }
  );
}

/* ================= Back to top ================= */

const toTop = document.getElementById("toTop");

toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" }));

window.addEventListener(
  "scroll",
  () => toTop.classList.toggle("show", window.scrollY > 600),
  { passive: true }
);
