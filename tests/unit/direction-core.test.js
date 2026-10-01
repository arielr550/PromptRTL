const test = require("node:test");
const assert = require("node:assert/strict");
const { firstStrongDirection } = require("../../src/direction-core.js");

const mark = (codePoint) => String.fromCodePoint(codePoint);
const RLM = mark(0x200f);
const ALM = mark(0x061c);
const LRM = mark(0x200e);
const ZWNJ = mark(0x200c);

const rtlPrompts = {
  Hebrew: "שלום עולם",
  Arabic: "مرحبا بالعالم",
  Persian: "سلام دنیا، چطوری؟",
  Urdu: "ہیلو دنیا",
  "Hebrew presentation forms": mark(0xfb2a),
  "Arabic presentation forms": mark(0xfefb)
};

for (const [language, prompt] of Object.entries(rtlPrompts)) {
  test(`detects ${language} as RTL`, () => {
    assert.equal(firstStrongDirection(prompt), "rtl");
  });
}

test("does not classify letters outside Hebrew and Arabic scripts as supported RTL", () => {
  // Representative letters from the unrelated blocks previously supported.
  for (const codePoint of [0x0710, 0x0780, 0x07ca, 0x0800, 0x0840, 0x10d00, 0x1e900]) {
    assert.equal(firstStrongDirection(mark(codePoint)), "ltr", `U+${codePoint.toString(16)}`);
  }
});

test("detects left-to-right scripts as LTR", () => {
  for (const prompt of ["Hello", "Привет", "Γειά σου", "你好", "こんにちは", "नमस्ते", "안녕하세요"]) {
    assert.equal(firstStrongDirection(prompt), "ltr", prompt);
  }
});

test("ignores numbers, punctuation, and combining marks before the first letter", () => {
  assert.equal(firstStrongDirection("123... שלום"), "rtl");
  assert.equal(firstStrongDirection("۱۲۳ - سلام"), "rtl");
  assert.equal(firstStrongDirection("٣٤٥ - Hello"), "ltr");
  assert.equal(firstStrongDirection(mark(0x05b0) + "Hello"), "ltr");
});

test("ignores the zero-width non-joiner used in Persian and Urdu", () => {
  assert.equal(firstStrongDirection(ZWNJ + "می" + ZWNJ + "خواهم"), "rtl");
});

test("keeps the direction of the first letter in mixed-language prompts", () => {
  assert.equal(firstStrongDirection("כתוב summary קצר"), "rtl");
  assert.equal(firstStrongDirection("اكتب summary قصير"), "rtl");
  assert.equal(firstStrongDirection("Summarize המאמר הזה"), "ltr");
});

test("honors explicit direction marks", () => {
  assert.equal(firstStrongDirection(RLM + "ChatGPT"), "rtl");
  assert.equal(firstStrongDirection(ALM + "ChatGPT"), "rtl");
  assert.equal(firstStrongDirection(LRM + "שלום"), "ltr");
});

test("returns no direction for neutral or missing text", () => {
  for (const text of ["123 - :)", "", " \n\t", null, undefined]) {
    assert.equal(firstStrongDirection(text), null);
  }
});
