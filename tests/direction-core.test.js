const test = require("node:test");
const assert = require("node:assert/strict");
const {
  firstStrongDirection,
  directionForEdit
} = require("../src/direction-core.js");

test("detects Hebrew as RTL", () => {
  assert.equal(firstStrongDirection("שלום עולם"), "rtl");
});

test("ignores punctuation and numbers before Hebrew", () => {
  assert.equal(firstStrongDirection("123... שלום"), "rtl");
});

test("ignores Hebrew combining marks until it finds a letter", () => {
  assert.equal(firstStrongDirection("\u05B0Hello"), "ltr");
});

test("detects Latin text as LTR", () => {
  assert.equal(firstStrongDirection("Hello world"), "ltr");
});

test("keeps Hebrew-first mixed text RTL", () => {
  assert.equal(firstStrongDirection("כתוב summary קצר"), "rtl");
});

test("keeps English-first mixed text LTR", () => {
  assert.equal(firstStrongDirection("Summarize המאמר הזה"), "ltr");
});

test("returns no direction for neutral text", () => {
  assert.equal(firstStrongDirection("123 - :)"), null);
});

test("uses inserted Hebrew for an empty field before browser insertion", () => {
  assert.equal(directionForEdit("", "ש", null), "rtl");
});

test("does not flip a Hebrew sentence when English is inserted", () => {
  assert.equal(directionForEdit("שלום", "AI", "rtl"), "rtl");
});

test("retains the previous direction while the field is empty", () => {
  assert.equal(directionForEdit("", "", "rtl"), "rtl");
});
