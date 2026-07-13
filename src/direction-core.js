(function exposeDirectionCore(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.RTLInputDirection = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDirectionCore() {
  "use strict";

  // Hebrew, Arabic, Syriac, Thaana, N'Ko, and their presentation forms.
  // Treating the related RTL scripts correctly costs nothing and makes the
  // extension useful beyond its Hebrew-first purpose.
  const RTL_LETTER = /[\u0590-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/u;
  const ANY_LETTER = /\p{L}/u;

  function firstStrongDirection(text) {
    for (const character of String(text || "")) {
      if (RTL_LETTER.test(character) && ANY_LETTER.test(character)) {
        return "rtl";
      }

      if (ANY_LETTER.test(character)) {
        return "ltr";
      }
    }

    return null;
  }

  function directionForEdit(currentText, insertedText, previousDirection) {
    return (
      firstStrongDirection(currentText) ||
      firstStrongDirection(insertedText) ||
      previousDirection ||
      null
    );
  }

  return {
    firstStrongDirection,
    directionForEdit
  };
});
