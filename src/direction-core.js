(function exposeDirectionCore(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.PromptRTLCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDirectionCore() {
  "use strict";

  // Hebrew letters, including presentation forms, trigger RTL. Other letters
  // use LTR so English remains readable in mixed prompts.
  const RTL_LETTER = /\p{Script=Hebrew}/u;
  const ANY_LETTER = /\p{L}/u;
  const RIGHT_TO_LEFT_MARK = "\u200F";
  const LEFT_TO_RIGHT_MARK = "\u200E";

  function firstStrongDirection(text) {
    for (const character of String(text || "")) {
      if (ANY_LETTER.test(character)) {
        return RTL_LETTER.test(character) ? "rtl" : "ltr";
      }

      // Invisible marks people insert on purpose to force a direction.
      if (character === RIGHT_TO_LEFT_MARK) return "rtl";
      if (character === LEFT_TO_RIGHT_MARK) return "ltr";
    }

    return null;
  }

  return {
    firstStrongDirection
  };
});
