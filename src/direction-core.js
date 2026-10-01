(function exposeDirectionCore(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.PromptRTLCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDirectionCore() {
  "use strict";

  // Supported languages: Hebrew, Arabic, Persian (Farsi), and Urdu. Persian
  // and Urdu use the Arabic script. Script properties include presentation
  // forms and extended letters without including unrelated Unicode blocks.
  // Languages sharing these scripts cannot be distinguished by direction.
  const RTL_LETTER = /[\p{Script=Hebrew}\p{Script=Arabic}]/u;
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
