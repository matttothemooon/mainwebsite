(function () {
  var container = document.getElementById("cms-pages");
  if (!container) return;

  fetch("/pages.json")
    .then(function (res) { return res.ok ? res.json() : []; })
    .then(function (pages) {
      pages.forEach(function (p) {
        var a = document.createElement("a");
        a.href = "/" + p.slug + ".html";
        a.textContent = p.title;
        container.appendChild(a);
      });
    })
    .catch(function () {});
})();
