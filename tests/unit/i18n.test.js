const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const localesDirectory = path.join(root, "_locales");
const locales = Object.fromEntries(
  fs.readdirSync(localesDirectory).map((code) => [
    code,
    JSON.parse(fs.readFileSync(path.join(localesDirectory, code, "messages.json"), "utf8"))
  ])
);
const englishKeys = Object.keys(locales.en).sort();
const rtlLocales = new Set(["ar", "fa", "he", "ur"]);

test("ships English plus the major RTL languages", () => {
  assert.deepEqual(Object.keys(locales).sort(), ["ar", "en", "fa", "he", "ur"]);
});

for (const [code, messages] of Object.entries(locales)) {
  test(`${code} translates every message`, () => {
    assert.deepEqual(Object.keys(messages).sort(), englishKeys);
    for (const [key, { message }] of Object.entries(messages)) {
      assert.ok(typeof message === "string" && message.trim(), `${code}.${key} is empty`);
    }
  });

  test(`${code} declares its own language and direction`, () => {
    assert.equal(messages.languageCode.message, code);
    assert.equal(messages.textDirection.message, rtlLocales.has(code) ? "rtl" : "ltr");
  });

  test(`${code} store description fits the Chrome Web Store limit`, () => {
    assert.ok([...messages.extDescription.message].length <= 132);
  });
}

test("manifest and popup reference only defined messages", () => {
  const sources = ["manifest.json", "popup/popup.html", "popup/popup.js"].map((file) =>
    fs.readFileSync(path.join(root, file), "utf8")
  );
  const references = sources.flatMap((source) => [
    ...[...source.matchAll(/__MSG_(\w+)__/g)].map((match) => match[1]),
    ...[...source.matchAll(/data-i18n="(\w+)"/g)].map((match) => match[1]),
    ...[...source.matchAll(/getMessage\("(\w+)"\)/g)].map((match) => match[1])
  ]);

  assert.ok(references.length > 0);
  for (const key of references) assert.ok(englishKeys.includes(key), `missing message ${key}`);
});
