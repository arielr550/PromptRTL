const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const runtimeFiles = [
  "src/direction-core.js",
  "src/content.js",
  "popup/popup.js",
  "popup/popup.html"
];
const runtimeSource = runtimeFiles
  .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
  .join("\n");

test("requests only the reviewed API permissions", () => {
  assert.deepEqual([...manifest.permissions].sort(), ["activeTab", "storage"]);
  assert.equal(manifest.background, undefined);
  assert.equal(manifest.externally_connectable, undefined);
  assert.equal(manifest.web_accessible_resources, undefined);
});

test("locks extension pages to bundled scripts", () => {
  assert.equal(
    manifest.content_security_policy.extension_pages,
    "script-src 'self'; object-src 'none'; base-uri 'none'"
  );
});

test("uses device-local settings rather than Chrome Sync", () => {
  assert.match(runtimeSource, /chrome\.storage\.local/);
  assert.doesNotMatch(runtimeSource, /chrome\.storage\.sync/);
});

test("contains no network or dynamic-code primitives", () => {
  const forbidden = [
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bWebSocket\b/,
    /\bsendBeacon\s*\(/,
    /\beval\s*\(/,
    /\bnew\s+Function\b/,
    /\.innerHTML\s*=/,
    /\.outerHTML\s*=/,
    /document\.write\s*\(/
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(runtimeSource, pattern);
  }
});

test("loads no remote scripts", () => {
  assert.doesNotMatch(runtimeSource, /<script[^>]+src=["']https?:\/\//i);
});

test("avoids background and iframe-wide browsing work", () => {
  assert.equal(manifest.content_scripts[0].all_frames, false);
  assert.equal(manifest.background, undefined);
  assert.doesNotMatch(runtimeSource, /\bMutationObserver\b/);
  assert.doesNotMatch(runtimeSource, /\bsetInterval\s*\(/);
  assert.doesNotMatch(runtimeSource, /\bsetTimeout\s*\(/);
});

test("avoids layout-sensitive editor reads", () => {
  assert.doesNotMatch(runtimeSource, /\.innerText\b/);
  assert.match(runtimeSource, /\.textContent\b/);
});
