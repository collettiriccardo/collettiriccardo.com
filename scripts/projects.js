/* Card visuals and page dynamics. */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- hero terminal: commands type themselves on load ---------- */
  const term = document.querySelector(".terminal__body code");
  if (term && !reduce) {
    const pre = term.parentElement;
    pre.style.minHeight = pre.offsetHeight + "px"; // no layout jump while typing
    const nodes = Array.from(term.childNodes);
    term.textContent = "";
    let i = 0;
    (function next() {
      if (i >= nodes.length) { pre.style.minHeight = ""; return; }
      const n = nodes[i++];
      if (n.nodeType === 1 && n.classList.contains("t-cmd")) {
        const full = n.textContent;
        const el = n.cloneNode(false);
        term.appendChild(el);
        let c = 0;
        (function typeChar() {
          el.textContent = full.slice(0, ++c);
          if (c < full.length) setTimeout(typeChar, 22);
          else setTimeout(next, 100);
        })();
      } else {
        term.appendChild(n);
        const isOut = n.nodeType === 1 && n.classList.contains("t-out");
        if (isOut) setTimeout(next, 130); else next();
      }
    })();
  }

  /* ---------- section titles: matrix-style decode on first reveal ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    const GLYPHS = "!<>-_\\/[]{}=+*^?#$%&";
    document.querySelectorAll(".section__title").forEach((t) => {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(t);
          const orig = t.textContent;
          const total = Math.max(24, orig.length * 4);
          let frame = 0;
          (function step() {
            frame++;
            const lock = Math.floor((frame / total) * orig.length);
            t.textContent =
              orig.slice(0, lock) +
              orig.slice(lock).split("").map((ch) =>
                ch === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0]
              ).join("");
            if (lock < orig.length) requestAnimationFrame(step);
            else t.textContent = orig;
          })();
        });
      }, { threshold: 0.6 });
      io.observe(t);
    });
  }

  /* ---------- drift filmstrip ---------- */
  document.querySelectorAll(".dstrip").forEach((strip) => {
    const win = strip.querySelector(".dstrip__win");
    const img = strip.querySelector(".dstrip__track");
    const label = strip.querySelector(".dstrip__decade");
    if (!win || !img) return;

    const CELLS = 11;            // 11 decade portraits in the strip
    const NATIVE_W = 1126;       // source strip width in px
    const decadeOf = (x) => {
      const scale = img.clientHeight / 127;               // 127 = native strip height
      const centerNative = (x + win.clientWidth / 2) / scale;
      let idx = Math.floor(centerNative / (NATIVE_W / CELLS));
      idx = Math.max(0, Math.min(CELLS - 1, idx));
      return (1910 + idx * 10) + "s";
    };

    let x = 0, dir = 1, paused = false, last = null;
    const speed = 24; // px/s

    function tick(t) {
      if (last === null) last = t;
      const dt = (t - last) / 1000; last = t;
      if (!paused) {
        const max = Math.max(0, img.clientWidth - win.clientWidth);
        x += dir * speed * dt;
        if (x >= max) { x = max; dir = -1; }
        if (x <= 0)   { x = 0;   dir = 1; }
        img.style.transform = "translateX(" + (-x) + "px)";
        if (label) label.textContent = decadeOf(x);
      }
      requestAnimationFrame(tick);
    }

    strip.addEventListener("pointerenter", () => { paused = true; });
    strip.addEventListener("pointerleave", () => { paused = false; });

    function boot() {
      if (label) label.textContent = decadeOf(0);
      if (reduce) { img.style.transform = "translateX(0)"; return; }
      requestAnimationFrame(tick);
    }
    if (img.complete && img.naturalWidth) boot();
    else img.addEventListener("load", boot);
  });

  /* ---------- hydra: sharing-spectrum sweep (λ ping-pongs 0 ↔ 1) ---------- */
  document.querySelectorAll(".hydra").forEach((hy) => {
    const shared = hy.querySelector(".hy-shared");
    const indep = hy.querySelector(".hy-indep");
    const state = hy.closest(".card__viz")?.querySelector(".hydra__state");
    if (!shared || !indep) return;

    function apply(lam) {
      shared.style.opacity = lam;
      indep.style.opacity = 1 - lam;
      if (state) {
        const label = lam > 0.66 ? "shared" : lam < 0.33 ? "independent" : "hybrid";
        state.textContent = "λ = " + lam.toFixed(2) + " · " + label;
        state.classList.toggle("is-indep", lam < 0.33);
      }
    }

    let paused = false;
    hy.addEventListener("pointerenter", () => { paused = true; });
    hy.addEventListener("pointerleave", () => { paused = false; });

    apply(1);
    if (reduce) { apply(0.5); return; }
    let last = null, phase = 0; // phase freezes while paused → resumes where it left off
    (function tick(ts) {
      if (last === null) last = ts;
      const dt = ts - last; last = ts;
      if (!paused) {
        phase += dt / 9000; // 9s round trip
        apply(0.5 + 0.5 * Math.cos(phase * 2 * Math.PI));
      }
      requestAnimationFrame(tick);
    })(performance.now());
  });

  /* ---------- drift saliency grid: eval-year column sweep ---------- */
  document.querySelectorAll(".salviz").forEach((viz) => {
    const cells = viz.querySelectorAll(".sg-cell");
    const cols = viz.querySelectorAll(".sg-col");
    const year = viz.querySelector(".salviz__year");
    if (!cells.length) return;

    const YEARS = ["eval 1960", "eval 1980", "eval 2000"];
    let idx = 0, paused = false;

    function show(i) {
      cells.forEach((c) => c.classList.toggle("is-on", +c.dataset.col === i));
      cols.forEach((c) => c.classList.toggle("is-on", +c.dataset.col === i));
      if (year) year.textContent = YEARS[i];
    }

    // hover: pause the sweep and light the whole grid up for comparison
    viz.addEventListener("pointerenter", () => {
      paused = true;
      cells.forEach((c) => c.classList.add("is-on"));
    });
    viz.addEventListener("pointerleave", () => {
      paused = false;
      show(idx);
    });

    show(0);
    if (reduce) { cells.forEach((c) => c.classList.add("is-on")); return; }
    setInterval(() => {
      if (paused) return;
      idx = (idx + 1) % YEARS.length;
      show(idx);
    }, 1900);
  });

  /* ---------- hold your plate: rollout video (plays only in view) ---------- */
  document.querySelectorAll(".bop").forEach((bop) => {
    const video = bop.querySelector(".bop__video");
    const state = bop.closest(".card__viz")?.querySelector(".bop__state");
    if (!video) return;
    if (state) {
      video.addEventListener("timeupdate", () => {
        state.textContent = "t=" + video.currentTime.toFixed(1) + "s";
      });
    }
    if (reduce) return; // poster only
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      });
    }, { threshold: 0.25 });
    io.observe(bop);
  });

  /* ---------- zoomable figures: reuse the global lightbox ---------- */
  document.querySelectorAll(".bop-fig, .cv-pic").forEach((fig) => {
    const open = () => window.openLightbox?.(fig.dataset.src, fig.dataset.name || "");
    fig.addEventListener("click", open);
    fig.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });

  /* ---------- klip w–Â plane marker ---------- */
  document.querySelectorAll(".kplane").forEach((plane) => {
    const marker = plane.querySelector(".kp-marker");
    const halo = plane.querySelector(".kp-marker-halo");
    const state = plane.querySelector(".kplane__state");
    if (!marker) return;
    plane.classList.add("is-live");

    // region centres in the SVG's own viewBox coordinates (0 0 400 282)
    const P = {
      inb:    [215, 133],
      trkill: [327, 79],
      blkill: [102, 186],
      tlpass: [102, 79],
      brpass: [327, 186],
    };
    // a tour that keeps returning to the band, then straying into a corner
    const tour = [
      { p: P.inb,    s: "in",   d: 1.1 },
      { p: P.trkill, s: "kill", d: 1.5 },
      { p: P.inb,    s: "in",   d: 1.1 },
      { p: P.brpass, s: "pass", d: 1.3 },
      { p: P.inb,    s: "in",   d: 1.0 },
      { p: P.blkill, s: "kill", d: 1.5 },
      { p: P.inb,    s: "in",   d: 1.1 },
      { p: P.tlpass, s: "pass", d: 1.3 },
    ];

    function place(x, y) {
      marker.setAttribute("cx", x); marker.setAttribute("cy", y);
      if (halo) { halo.setAttribute("cx", x); halo.setAttribute("cy", y); }
    }
    function say(s) {
      if (!state) return;
      state.classList.toggle("is-kill", s === "kill");
      state.classList.toggle("is-in", s !== "kill");
      state.textContent = s === "kill"
        ? "I_kill · β = −wÂ"
        : (s === "pass" ? "I_pass · β = 0" : "I_in · β = 0");
    }

    place(P.inb[0], P.inb[1]); say("in");
    if (reduce) return;

    let seg = 0, segT = 0, last = null;
    function tick(ts) {
      if (last === null) last = ts;
      const dt = (ts - last) / 1000; last = ts;
      const a = tour[seg], b = tour[(seg + 1) % tour.length];
      segT += dt / b.d;
      const k = Math.min(1, segT);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOut
      place(a.p[0] + (b.p[0] - a.p[0]) * e, a.p[1] + (b.p[1] - a.p[1]) * e);
      say(k > 0.55 ? b.s : a.s);
      if (segT >= 1) { seg = (seg + 1) % tour.length; segT = 0; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
})();
