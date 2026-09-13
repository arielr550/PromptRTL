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
  Yiddish: "גוט מאָרגן",
  Arabic: "مرحبا بالعالم",
  Persian: "سلام دنیا، چطوری؟",
  Urdu: "ہیلو دنیا",
  Pashto: "سلام نړۍ",
  "Kurdish (Sorani)": "سڵاو جیهان",
  Uyghur: "ياخشىمۇسىز",
  Sindhi: "ڀلي ڪري آيا",
  Syriac: "ܫܠܡܐ",
  Dhivehi: "ހެލޯ",
  "N'Ko": "ߒߞߏ",
  "Hebrew presentation forms": mark(0xfb2a),
  "Arabic presentation forms": mark(0xfefb),
  Adlam: mark(0x1e900) + mark(0x1e922),
  "Hanifi Rohingya": mark(0x10d00)
};

for (const [language, prompt] of Object.entries(rtlPrompts)) {
  test(`detects ${language} as RTL`, () => {
    assert.equal(firstStrongDirection(prompt), "rtl");
  });
}

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
