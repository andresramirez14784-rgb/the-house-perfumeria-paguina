/* Carrusel 3D del catálogo: desplazamiento con flechas, puntos, arrastre
   y efecto "coverflow" según la distancia al centro. */
(function () {
  var track = document.getElementById("catalogTrack");
  if (!track) return;

  var dotsWrap = document.getElementById("catDots");
  var prev = document.getElementById("catPrev");
  var next = document.getElementById("catNext");
  var slides = Array.prototype.slice.call(track.querySelectorAll(".slide"));
  if (!slides.length) return;

  var active = 0;

  /* Puntos de navegación */
  var dots = slides.map(function (_, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "catalog__dot" + (i === 0 ? " is-active" : "");
    b.setAttribute("aria-label", "Ir a la fragancia " + (i + 1));
    b.addEventListener("click", function () {
      goTo(i);
    });
    if (dotsWrap) dotsWrap.appendChild(b);
    return b;
  });

  function centerOf(slide) {
    return slide.offsetLeft + slide.offsetWidth / 2;
  }

  function viewportCenter() {
    return track.scrollLeft + track.clientWidth / 2;
  }

  function update() {
    var center = viewportCenter();
    var half = track.clientWidth / 2;
    var best = 0;
    var bestDist = Infinity;
    var entries = [];

    slides.forEach(function (slide, i) {
      var d = (centerOf(slide) - center) / half;
      var t = Math.max(-1, Math.min(1, d));
      if (Math.abs(d) < bestDist) {
        bestDist = Math.abs(d);
        best = i;
      }
      entries.push({ slide: slide, t: t });
    });

    entries.forEach(function (e, i) {
      var at = Math.abs(e.t);
      var depth = (1 - at) * 85 - 30;

      e.slide.style.transform =
        "translateZ(" + depth.toFixed(1) + "px)" +
        " rotateY(" + (e.t * -10).toFixed(2) + "deg)" +
        " scale(" + (1 - at * 0.07).toFixed(3) + ")";
      e.slide.style.opacity = String(Math.max(0.45, 1 - at * 0.5));
      e.slide.style.zIndex = String(100 - Math.round(at * 50));
      e.slide.classList.toggle("is-active", i === best);
    });

    if (best !== active) {
      active = best;
      dots.forEach(function (dot, i) {
        dot.classList.toggle("is-active", i === active);
      });
    }
  }

  function goTo(i) {
    var slide = slides[Math.max(0, Math.min(slides.length - 1, i))];
    var left = slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2;
    track.scrollTo({ left: left, behavior: "smooth" });
  }

  if (prev) prev.addEventListener("click", function () { goTo(active - 1); });
  if (next) next.addEventListener("click", function () { goTo(active + 1); });

  track.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(active + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(active - 1); }
  });

  /* Arrastre con el mouse */
  var dragging = false;
  var startX = 0;
  var startLeft = 0;

  track.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "touch") return;
    dragging = true;
    startX = e.clientX;
    startLeft = track.scrollLeft;
    track.classList.add("is-dragging");
  });

  window.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    track.scrollLeft = startLeft - (e.clientX - startX);
  });

  window.addEventListener("pointerup", function () {
    if (!dragging) return;
    dragging = false;
    track.classList.remove("is-dragging");
    var nearest = 0;
    var dist = Infinity;
    slides.forEach(function (slide, i) {
      var d = Math.abs(centerOf(slide) - viewportCenter());
      if (d < dist) { dist = d; nearest = i; }
    });
    goTo(nearest);
  });

  var raf = 0;
  track.addEventListener("scroll", function () {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      update();
    });
  }, { passive: true });

  window.addEventListener("resize", update);
  update();
})();
