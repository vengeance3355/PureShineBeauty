const header = document.querySelector("[data-header]");
const menu = document.querySelector("[data-menu]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const revealItems = Array.from(document.querySelectorAll(".fade-in-up"));
const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
const form = document.querySelector("[data-appointment-form]");
const formStatus = document.querySelector("[data-form-status]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function setHeaderState() {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 42);
}

function setActiveNav() {
  const sections = navLinks
    .map((link) => {
      const id = link.getAttribute("href");
      if (!id || !id.startsWith("#")) return null;
      const section = document.querySelector(id);
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  let active = null;
  let closest = Infinity;
  sections.forEach(({ link, section }) => {
    const rect = section.getBoundingClientRect();
    const distance = Math.abs(rect.top - 130);
    if (rect.top < window.innerHeight * 0.75 && distance < closest) {
      active = link;
      closest = distance;
    }
  });

  navLinks.forEach((link) => link.classList.toggle("is-active", link === active));
}

function closeMenu() {
  if (!menu || !menuToggle) return;
  menu.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  document.body.classList.remove("nav-open");
  const icon = menuToggle.querySelector(".material-symbols-outlined");
  if (icon) icon.textContent = "menu";
}

function initMenu() {
  if (!menu || !menuToggle) return;

  menuToggle.addEventListener("click", () => {
    const open = !menu.classList.contains("is-open");
    menu.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("nav-open", open);
    const icon = menuToggle.querySelector(".material-symbols-outlined");
    if (icon) icon.textContent = open ? "close" : "menu";
  });

  navLinks.forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

function initReveal() {
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -48px 0px" }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function setStatus(message, type = "") {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.classList.toggle("is-error", type === "error");
  formStatus.classList.toggle("is-success", type === "success");
}

function formToPayload(target) {
  const data = new FormData(target);
  return {
    name: String(data.get("name") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    service: String(data.get("service") || "").trim(),
    message: String(data.get("message") || "").trim(),
    consent: data.get("consent") === "on"
  };
}

function buildWhatsappUrl(payload) {
  const lines = [
    "Merhaba Pure Shine, randevu almak istiyorum.",
    `Ad Soyad: ${payload.name}`,
    `Telefon: ${payload.phone}`,
    payload.service ? `Hizmet: ${payload.service}` : "",
    payload.message ? `Not: ${payload.message}` : ""
  ].filter(Boolean);
  return `https://wa.me/905073776722?text=${encodeURIComponent(lines.join("\n"))}`;
}

function validatePayload(payload) {
  const digits = payload.phone.replace(/\D/g, "");
  if (payload.name.length < 2) return "Lütfen ad soyad bilgisini yazın.";
  if (digits.length < 10) return "Lütfen geçerli bir telefon numarası yazın.";
  if (!payload.consent) return "Randevu isteği için iletişim iznini onaylamanız gerekiyor.";
  return "";
}

async function submitAppointment(event) {
  event.preventDefault();
  const payload = formToPayload(event.currentTarget);
  const error = validatePayload(payload);
  if (error) {
    setStatus(error, "error");
    return;
  }

  const submitButton = event.currentTarget.querySelector("button[type='submit']");
  if (submitButton) submitButton.disabled = true;
  setStatus("Randevu isteği gönderiliyor...");

  try {
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Form backend'i yanıt vermedi.");
    }

    event.currentTarget.reset();
    setStatus("Randevu isteğiniz alındı. Ekip en kısa sürede dönüş yapacak.", "success");
  } catch (submitError) {
    const whatsappUrl = buildWhatsappUrl(payload);
    setStatus("Backend şu an kullanılamıyor. WhatsApp ile göndermek için yönlendiriliyorsunuz.", "error");
    window.setTimeout(() => {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }, 500);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

function initForm() {
  if (!form) return;
  form.addEventListener("submit", submitAppointment);
}

let scrollTicking = false;
function requestScrollUpdate() {
  if (scrollTicking) return;
  scrollTicking = true;
  window.requestAnimationFrame(() => {
    scrollTicking = false;
    setHeaderState();
    setActiveNav();
  });
}

function init() {
  initMenu();
  initReveal();
  initForm();
  setHeaderState();
  setActiveNav();
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate);
}

init();
