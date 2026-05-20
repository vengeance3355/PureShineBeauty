const root = document.documentElement;
const header = document.querySelector("[data-header]");
const loader = document.querySelector("[data-loader]");
const chapters = Array.from(document.querySelectorAll("[data-chapter]"));
const revealItems = Array.from(document.querySelectorAll("[data-reveal]"));
const navItems = Array.from(document.querySelectorAll("[data-nav]"));
const serviceRows = Array.from(document.querySelectorAll(".service-row"));
const methodSteps = Array.from(document.querySelectorAll(".method-step"));
const metricCards = Array.from(document.querySelectorAll(".metric-card"));
const motionMedia = Array.from(document.querySelectorAll(".editorial-visual figure, .route-visual, .proof-visual"));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  progress: 0,
  activeStage: 0
};

let scrollTicking = false;
let loaderClosed = false;

if (!reducedMotion) root.classList.add("can-animate");

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function proximityToViewport(element, focus = 0.58, strength = 1.55) {
  const rect = element.getBoundingClientRect();
  const center = (rect.top + rect.height / 2) / window.innerHeight;
  return clamp(1 - Math.abs(center - focus) * strength);
}

function setLoaded() {
  if (loaderClosed) return;
  loaderClosed = true;
  document.body.classList.add("is-loaded");
  if (loader) loader.setAttribute("aria-hidden", "true");
}

function updateActiveNav(stage) {
  navItems.forEach((item) => {
    item.classList.toggle("is-active", Number(item.dataset.nav) === stage);
  });
}

function updateDomMotion() {
  if (reducedMotion) return;

  serviceRows.forEach((row, index) => {
    const active = proximityToViewport(row, 0.58, 1.5);
    const direction = index % 2 === 0 ? -1 : 1;
    row.style.setProperty("--slide", `${(direction * active * 18).toFixed(2)}px`);
  });

  methodSteps.forEach((item, index) => {
    const active = proximityToViewport(item, 0.6, 1.6);
    item.style.setProperty("--lift", `${(-24 * active + index * 2).toFixed(2)}px`);
  });

  metricCards.forEach((item, index) => {
    const active = proximityToViewport(item, 0.6, 1.7);
    item.style.setProperty("--lift", `${(-22 * active + index * 2).toFixed(2)}px`);
  });

  motionMedia.forEach((item, index) => {
    const active = proximityToViewport(item, 0.52, 1.2);
    item.style.setProperty("--media-lift", `${(-30 * active + index * 2).toFixed(2)}px`);
  });
}

function updateScrollState() {
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  state.progress = clamp(window.scrollY / max);
  root.style.setProperty("--scroll", state.progress.toFixed(4));

  if (header) header.classList.toggle("is-scrolled", window.scrollY > 30);

  let nearestStage = 0;
  let nearestDistance = Infinity;
  chapters.forEach((chapter, index) => {
    const rect = chapter.getBoundingClientRect();
    const distance = Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestStage = index;
    }
  });

  state.activeStage = nearestStage;
  root.style.setProperty("--stage", nearestStage);
  updateActiveNav(nearestStage);
  updateDomMotion();
}

function requestScrollUpdate() {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    scrollTicking = false;
    updateScrollState();
  });
}

function initReveal() {
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const delay = entry.target.dataset.revealDelay;
        if (delay) entry.target.style.setProperty("--delay", `${delay}ms`);
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.13, rootMargin: "0px 0px -8% 0px" }
  );

  revealItems.forEach((item) => observer.observe(item));
  requestAnimationFrame(() => {
    revealItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.94 && rect.bottom > 0) item.classList.add("is-visible");
    });
  });
}

function initGsapEnhancements() {
  if (reducedMotion || !window.gsap || !window.ScrollTrigger) return;

  window.gsap.registerPlugin(window.ScrollTrigger);

  window.gsap.utils.toArray(".section-title, .contact-copy, .location-card").forEach((block) => {
    window.gsap.fromTo(
      block,
      { y: 40 },
      {
        y: 0,
        ease: "power3.out",
        scrollTrigger: {
          trigger: block,
          start: "top 84%",
          end: "top 45%",
          scrub: 0.7
        }
      }
    );
  });

  window.gsap.utils.toArray(".editorial-visual figure, .services-aside, .route-visual, .proof-visual").forEach((item) => {
    window.gsap.fromTo(
      item,
      { scale: 0.965 },
      {
        scale: 1,
        ease: "none",
        scrollTrigger: {
          trigger: item,
          start: "top 92%",
          end: "center 46%",
          scrub: true
        }
      }
    );
  });

  window.addEventListener("load", () => window.ScrollTrigger.refresh());
}

function initParticles() {
  const target = document.getElementById("particles-js");
  if (!target || !window.particlesJS) return;

  const mobile = window.innerWidth < 760;
  const particleCount = reducedMotion ? (mobile ? 18 : 28) : (mobile ? 46 : 90);
  const particleSpeed = reducedMotion ? 0.4 : (mobile ? 1.35 : 2.2);

  window.particlesJS("particles-js", {
    particles: {
      number: {
        value: particleCount,
        density: {
          enable: true,
          value_area: mobile ? 540 : 920
        }
      },
      color: {
        value: ["#c8a065", "#c65d7c", "#587468", "#fff8ef"]
      },
      shape: {
        type: "circle",
        stroke: {
          width: 0,
          color: "#000000"
        }
      },
      opacity: {
        value: reducedMotion ? 0.22 : 0.36,
        random: true,
        anim: {
          enable: !reducedMotion,
          speed: 0.45,
          opacity_min: 0.08,
          sync: false
        }
      },
      size: {
        value: mobile ? 1.55 : 2.05,
        random: true,
        anim: {
          enable: false,
          speed: 0,
          size_min: 0.4,
          sync: false
        }
      },
      line_linked: {
        enable: true,
        distance: mobile ? 112 : 152,
        color: "#c8a065",
        opacity: mobile ? 0.12 : 0.18,
        width: 1
      },
      move: {
        enable: !reducedMotion,
        speed: particleSpeed,
        direction: "none",
        random: true,
        straight: false,
        out_mode: "out",
        bounce: false,
        attract: {
          enable: false,
          rotateX: 600,
          rotateY: 1200
        }
      }
    },
    interactivity: {
      detect_on: "canvas",
      events: {
        onhover: {
          enable: false,
          mode: "grab"
        },
        onclick: {
          enable: false,
          mode: "push"
        },
        resize: true
      },
      modes: {
        grab: {
          distance: 120,
          line_linked: {
            opacity: 0.16
          }
        },
        push: {
          particles_nb: 0
        }
      }
    },
    retina_detect: true
  });
}

function init() {
  initReveal();
  initParticles();
  initGsapEnhancements();
  updateScrollState();
  setLoaded();

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate);
  window.addEventListener("load", () => {
    setLoaded();
    updateScrollState();
  });
}

init();
