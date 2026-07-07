/* ---------- year ---------- */
document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- custom cursor ---------- */
const cursor = document.querySelector(".cursor");
let cx = 0, cy = 0, tx = 0, ty = 0;
window.addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; });

(function loop() {
  cx += (tx - cx) * 0.18;
  cy += (ty - cy) * 0.18;
  cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
  requestAnimationFrame(loop);
})();

document.querySelectorAll("a, button, .card").forEach((el) => {
  el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
  el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
});

/* ---------- scroll reveal ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("in");
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: "0px 0px -10% 0px" });

document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

/* ---------- lightbox ---------- */
const lightbox = document.getElementById("lightbox");
const lbImg    = lightbox?.querySelector(".lightbox__img");
const lbName   = document.getElementById("lb-name");
const lbTag    = document.getElementById("lb-tag");

function openLightbox(src, name, tag = "") {
  if (!lightbox) return;
  lbImg.src = src;
  lbName.textContent = name;
  lbTag.textContent = tag;
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
window.openLightbox = openLightbox;
document.querySelectorAll(".frame").forEach((f) => {
  f.setAttribute("role", "button");
  f.tabIndex = 0;
  const open = () => {
    const name = f.querySelector(".frame__name")?.textContent || "";
    const tag = f.classList.contains("frame--ee") ? "// easter egg inside" : "";
    openLightbox(f.dataset.src, name, tag);
  };
  f.addEventListener("click", open);
  f.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });
});
lightbox?.addEventListener("click", (e) => {
  if (e.target === lightbox || e.target.classList.contains("lightbox__close")) closeLightbox();
});
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

/* ---------- tilt on cards ---------- */
const cards = document.querySelectorAll(".card:not(.has-viz)");
cards.forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(900px) rotateX(${-y * 6}deg) rotateY(${x * 8}deg) translateY(-4px)`;
  });
  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });
});
