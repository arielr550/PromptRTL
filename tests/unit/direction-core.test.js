const test = require("node:test");
const assert = require("node:assert/strict");
const { firstStrongDirection } = require("../../src/direction-core.js");

const mark = (codePoint) => String.fromCodePoint(codePoint);
const RLM = mark(0x200f);
const LRM = mark(0x200e);

const rtlPrompts = {
  Hebrew: "שלום עולם",
  "Hebrew presentation forms": mark(0xfb2a)
};

for (const [language, prompt] of Object.entries(rtlPrompts)) {
  test(`detects ${language} as RTL`, () => {
    assert.equal(firstStrongDirection(prompt), "rtl");
  });
}

test("only Hebrew script letters trigger automatic RTL", () => {
  for (const codePoint of [0x0627, 0x08a0, 0xfe8d, 0x0710, 0x0780, 0x07ca, 0x1e900]) {
    assert.equal(firstStrongDirection(mark(codePoint)), "ltr", `U+${codePoint.toString(16)}`);
  }
});

test("detects English as LTR", () => {
  assert.equal(firstStrongDirection("Hello world"), "ltr");
});

test("ignores numbers, punctuation, and combining marks before the first letter", () => {
  assert.equal(firstStrongDirection("123... שלום"), "rtl");
  assert.equal(firstStrongDirection("123 - Hello"), "ltr");
  assert.equal(firstStrongDirection(mark(0x05b0) + "Hello"), "ltr");
});

test("keeps the direction of the first letter in mixed-language prompts", () => {
  assert.equal(firstStrongDirection("כתוב summary קצר"), "rtl");
  assert.equal(firstStrongDirection("Summarize המאמר הזה"), "ltr");
});

test("honors explicit direction marks", () => {
  assert.equal(firstStrongDirection(RLM + "ChatGPT"), "rtl");
  assert.equal(firstStrongDirection(LRM + "שלום"), "ltr");
});

test("returns no direction for neutral or missing text", () => {
  for (const text of ["123 - :)", "", " \n\t", null, undefined]) {
    assert.equal(firstStrongDirection(text), null);
  }
});
