(function exposeDirectionCore(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.PromptRTLCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDirectionCore() {
  "use strict";

  // Unicode reserves these blocks for right-to-left scripts: Hebrew; Arabic,
  // including the letters used by Persian, Urdu, Pashto, Kurdish, Sindhi, and
  // Uyghur; Syriac, Thaana, N'Ko, their presentation forms; and newer RTL
  // scripts such as Adlam and Hanifi Rohingya. Block ranges, rather than
  // script names, keep working as Unicode adds letters inside them.
  const RTL_LETTER =
    /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF\u{10800}-\u{10FFF}\u{1E800}-\u{1EFFF}]/u;
  const ANY_LETTER = /\p{L}/u;
  const RIGHT_TO_LEFT_MARK = "\u200F";
  const ARABIC_LETTER_MARK = "\u061C";
  const LEFT_TO_RIGHT_MARK = "\u200E";

  function firstStrongDirection(text) {
    for (const character of String(text || "")) {
      if (ANY_LETTER.test(character)) {
        return RTL_LETTER.test(character) ? "rtl" : "ltr";
      }

      // Invisible marks people insert on purpose to force a direction.
      if (character === RIGHT_TO_LEFT_MARK || character === ARABIC_LETTER_MARK) return "rtl";
      if (character === LEFT_TO_RIGHT_MARK) return "ltr";
    }

    return null;
  }

  return {
    firstStrongDirection
  };
});
