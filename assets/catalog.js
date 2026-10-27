/* Selector de gramos para el catálogo.
   Cada tarjeta lleva data-unit (precio por gramo) y data-name (producto). */
(function () {
  var PHONE = "573001234567"; // Reemplaza por el WhatsApp real
  var fmt = function (n) {
    return "$ " + Number(n).toLocaleString("es-CO");
  };

  document.querySelectorAll(".product[data-unit]").forEach(function (card) {
    var unit = parseFloat(card.getAttribute("data-unit"));
    var name = card.getAttribute("data-name");
    var totalEl = card.querySelector("[data-total]");
    var waLink = card.querySelector("[data-wa]");
    var buttons = card.querySelectorAll(".product__grams button");
    if (!totalEl || !waLink || !buttons.length) return;

    function update(grams) {
      totalEl.textContent = fmt(unit * grams);
      var msg = encodeURIComponent("Hola, quiero " + grams + " ml de " + name + ".");
      waLink.setAttribute("href", "https://wa.me/" + PHONE + "?text=" + msg);
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        update(parseInt(btn.getAttribute("data-g"), 10));
      });
    });

    var active = card.querySelector(".product__grams button.is-active") || buttons[0];
    active.classList.add("is-active");
    update(parseInt(active.getAttribute("data-g"), 10));
  });
})();
