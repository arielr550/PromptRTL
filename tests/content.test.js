const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const core = require("../src/direction-core.js");

// A small DOM/event harness exercises the real content script without dependencies.
class Element {
  constructor(attributes = {}, parentElement = null) {
    this.attributes = new Map(Object.entries(attributes));
    this.parentElement = parentElement;
    this.textContent = "שלום";
  }
  hasAttribute(name) { return this.attributes.has(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  get contentEditable() { return this.getAttribute("contenteditable") ?? "inherit"; }
  closest(selector) {
    assert.equal(selector, "[data-input-direction-helper-ignore]");
    for (let node = this; node; node = node.parentElement) {
      if (node.hasAttribute("data-input-direction-helper-ignore")) return node;
    }
    return null;
  }
}
class HTMLInputElement extends Element {
  type = "text";
  value = "שלום";
  disabled = false;
  readOnly = false;
}
class HTMLTextAreaElement extends HTMLInputElement {}

function setup() {
  const listeners = new Map();
  let onChanged;
  const document = {
    activeElement: null,
    addEventListener: (name, listener) => listeners.set(name, listener)
  };
  vm.runInNewContext(fs.readFileSync(require.resolve("../src/content.js"), "utf8"), {
    RTLInputDirection: core, Element, HTMLInputElement, HTMLTextAreaElement,
    WeakRef, FinalizationRegistry, document,
    window: { location: { hostname: "example.com" } },
    chrome: { storage: {
      local: { get: (defaults, callback) => callback(defaults) },
      onChanged: { addListener: (listener) => { onChanged = listener; } }
    } }
  });
  return {
    emit(element, type = "input", extra = {}) {
      const path = [];
      for (let node = element; node; node = node.parentElement) path.push(node);
      listeners.get(type)({ composedPath: () => path, ...extra });
    },
    enable(value) { onChanged({ enabled: { newValue: value } }, "local"); }
  };
}

test("updates supported fields and restores the original direction", () => {
  const app = setup();
  const field = new HTMLTextAreaElement({ dir: "auto" });
  app.emit(field);
  assert.equal(field.getAttribute("dir"), "rtl");
  app.enable(false);
  assert.equal(field.getAttribute("dir"), "auto");
  assert.equal(field.hasAttribute("data-input-direction-helper"), false);
});

test("captures a fresh original direction after each re-enable", () => {
  const app = setup();
  const field = new HTMLTextAreaElement();
  app.emit(field);
  app.enable(false);
  assert.equal(field.hasAttribute("dir"), false);
  field.setAttribute("dir", "auto");
  app.enable(true);
  app.emit(field);
  app.enable(false);
  assert.equal(field.getAttribute("dir"), "auto");
});

for (const boundary of ["ignored", "noneditable", "password", "readonly"]) {
  test(`respects the ${boundary} boundary inside a parent editor`, () => {
    const app = setup();
    const editor = new Element({ contenteditable: "true" });
    let child;
    if (boundary === "ignored") child = new Element({ "data-input-direction-helper-ignore": "" }, editor);
    if (boundary === "noneditable") child = new Element({ contenteditable: "false", role: "textbox" }, editor);
    if (boundary === "password" || boundary === "readonly") {
      child = new HTMLInputElement({}, editor);
      child.type = boundary === "password" ? "password" : "text";
      child.readOnly = boundary === "readonly";
    }
    app.emit(child);
    assert.equal(child.hasAttribute("data-input-direction-helper"), false);
    assert.equal(editor.hasAttribute("data-input-direction-helper"), false);
  });
}

test("finds the editor when input comes from an ordinary descendant", () => {
  const app = setup();
  const editor = new Element({ contenteditable: "true" });
  app.emit(new Element({}, editor));
  assert.equal(editor.getAttribute("dir"), "rtl");
});

test("handles first-character input and reconciles completed composition", () => {
  const app = setup();
  const field = new HTMLTextAreaElement();
  field.value = "";
  app.emit(field, "beforeinput", { data: "ש" });
  assert.equal(field.getAttribute("dir"), "rtl");
  field.value = "Hello";
  app.emit(field, "input", { isComposing: true });
  assert.equal(field.getAttribute("dir"), "rtl");
  app.emit(field, "compositionend");
  assert.equal(field.getAttribute("dir"), "ltr");
});
