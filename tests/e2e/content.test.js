const { test, before, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { launchBrowser, directionState } = require("./harness.js");

let browser;
before(async () => {
  browser = await launchBrowser();
});
after(async () => {
  await browser?.close();
});
afterEach(async () => {
  await browser.setSettings({ enabled: true, disabledHosts: [] });
});

const selectAll = "ControlOrMeta+a";

test("switches a textarea to RTL before the first Hebrew letter is inserted", async () => {
  const page = await browser.openPage("plain.html");
  const field = page.locator("#textarea");
  await field.click();
  await page.keyboard.type("ש");

  const [firstEdit] = await page.evaluate(() => window.inputLog);
  assert.equal(firstEdit.data, "ש");
  assert.equal(firstEdit.dir, "rtl", "direction must be applied before insertion");

  await page.keyboard.type("לום עולם");
  assert.deepEqual(await directionState(field), {
    dir: "rtl",
    marker: "rtl",
    direction: "rtl",
    textAlign: "right",
    unicodeBidi: (await directionState(field)).unicodeBidi
  });
  await page.close();
});

test("keeps a Hebrew prompt RTL when English is added and follows a new first letter", async () => {
  const page = await browser.openPage("plain.html");
  const field = page.locator("#textarea");
  await field.click();
  await page.keyboard.type("כתוב summary קצר about AI");
  assert.equal((await directionState(field)).dir, "rtl");

  await page.keyboard.press(selectAll);
  await page.keyboard.type("Summarize המאמר");
  assert.equal((await directionState(field)).dir, "ltr");
  await page.close();
});

test("keeps the direction while a field is emptied, then follows the next letter", async () => {
  const page = await browser.openPage("plain.html");
  const field = page.locator("#textarea");
  await field.click();
  await page.keyboard.type("שלום");
  for (let i = 0; i < 4; i++) await page.keyboard.press("Backspace");
  assert.equal(await field.inputValue(), "");
  assert.equal((await directionState(field)).dir, "rtl");

  await page.keyboard.type("123 Hi");
  assert.equal((await directionState(field)).dir, "ltr");
  await page.close();
});

test("recognizes Arabic, Persian, and Urdu prompts", async () => {
  const page = await browser.openPage("plain.html");
  const field = page.locator("#text");
  for (const prompt of ["مرحبا، لخص هذا المقال", "سلام، این مقاله را خلاصه کن", "ہیلو، اس مضمون کا خلاصہ لکھیں"]) {
    await field.fill("");
    await field.click();
    await page.keyboard.press(selectAll);
    await page.keyboard.type("Go");
    assert.equal((await directionState(field)).dir, "ltr");
    await page.keyboard.press(selectAll);
    await page.keyboard.type(prompt);
    assert.equal((await directionState(field)).dir, "rtl", prompt);
  }
  await page.close();
});

test("leaves sensitive, read-only, and opted-out fields untouched", async () => {
  const page = await browser.openPage("plain.html");
  for (const selector of ["#password", "#email", "#readonly", "#ignored"]) {
    const field = page.locator(selector);
    await field.click();
    await page.keyboard.type("שלום");
    assert.deepEqual(
      { dir: (await directionState(field)).dir, marker: (await directionState(field)).marker },
      { dir: null, marker: null },
      selector
    );
  }
  await page.close();
});

test("restores a site's own dir attribute when turned off", async () => {
  const page = await browser.openPage("plain.html");
  const field = page.locator("#site-auto");
  await field.click();
  await page.keyboard.type("שלום");
  assert.equal((await directionState(field)).dir, "rtl");

  await browser.setSettings({ enabled: false });
  await page.waitForFunction(() => !document.querySelector("#site-auto").hasAttribute("data-promptrtl"));
  assert.equal((await directionState(field)).dir, "auto");
  await page.close();
});

test("can be turned off for only the current site", async () => {
  await browser.setSettings({ disabledHosts: ["127.0.0.1"] });
  const page = await browser.openPage("plain.html");
  const field = page.locator("#textarea");
  await field.click();
  await page.keyboard.type("שלום");
  assert.equal((await directionState(field)).marker, null);

  await browser.setSettings({ disabledHosts: [] });
  await page.waitForFunction(() => document.querySelector("#textarea").getAttribute("dir") === "rtl");
  await page.close();
});

test("handles text fields inside open shadow DOM", async () => {
  const page = await browser.openPage("plain.html");
  const field = page.locator("#shadow-textarea");
  await field.click();
  await page.keyboard.type("שלום");
  const state = await directionState(field);
  assert.equal(state.dir, "rtl");
  assert.equal(state.direction, "rtl");
  await page.close();
});

for (const [name, file, selector] of [
  ["ProseMirror composer (ChatGPT, Claude)", "prosemirror.html", ".ProseMirror"],
  ["Quill composer (Gemini)", "quill.html", ".ql-editor"]
]) {
  test(`${name}: switches direction without disturbing the editor`, async () => {
    const page = await browser.openPage(file);
    const editor = page.locator(selector);
    await editor.click();
    await page.keyboard.type("ש");
    assert.equal((await page.evaluate(() => window.inputLog))[0].dir, "rtl");

    await page.keyboard.type("לום, תסכם את המאמר");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Keep the English terms");
    assert.deepEqual(
      await page.evaluate(() => window.editor.text()),
      "שלום, תסכם את המאמר\nKeep the English terms"
    );
    let state = await directionState(editor);
    assert.equal(state.dir, "rtl");
    assert.equal(state.direction, "rtl");
    assert.equal(state.textAlign, "right");

    // The editor's own updates must not strip the direction.
    await page.evaluate(() => window.editor.appendText(" please"));
    assert.equal((await directionState(editor)).dir, "rtl");

    await page.keyboard.press(selectAll);
    await page.keyboard.type("Hello there");
    assert.equal(await page.evaluate(() => window.editor.text()), "Hello there");
    assert.equal((await directionState(editor)).dir, "ltr");
    await page.close();
  });
}
