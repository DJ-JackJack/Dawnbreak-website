/* search.js — Pagefind UI, themed by main.css via its own CSS variables. */
(function () {
  "use strict";
  if (typeof PagefindUI === "undefined") return;   // dev build, no index yet
  new PagefindUI({
    element: "#search",
    showImages: false,
    showSubResults: true,
    resetStyles: false,
    translations: { placeholder: "Search the record" },
  });
})();
