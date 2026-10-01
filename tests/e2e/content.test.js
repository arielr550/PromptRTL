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
  const state = await directionState(field);
  assert.equal(state.dir, "rtl");
  assert.equal(state.marker, "rtl");
  assert.equal(state.direction, "rtl");
  assert.equal(state.textAlign, "right");
  // plaintext would send lines without letters back to left-to-right.
  assert.notEqual(state.unicodeBidi, "plaintext");
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

test("uses LTR for letters outside the Hebrew script", async () => {
  const page = await browser.openPage("plain.html");
  const field = page.locator("#text");
  for (const codePoint of [0x0627, 0x08a0, 0xfe8d]) {
    await field.click();
    await page.keyboard.press(selectAll);
    await page.keyboard.type("שלום");
    assert.equal((await directionState(field)).dir, "rtl");
    await page.keyboard.press(selectAll);
    await page.keyboard.type(String.fromCodePoint(codePoint));
    assert.equal((await directionState(field)).dir, "ltr");
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
  await page.waitForFunction(() => !document.querySelector("#site-auto").hasAttribute("data-promptrtl"), null, {
    timeout: 5000
  });
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
  await page.waitForFunction(() => document.querySelector("#textarea").getAttribute("dir") === "rtl", null, {
    timeout: 5000
  });
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

test("does not treat buttons inside role=textbox wrappers as editors", async () => {
  const page = await browser.openPage("plain.html");
  await page.locator("#wrapped-button").focus();
  await page.keyboard.press("Space");
  const state = await directionState(page.locator("#textbox-wrapper"));
  assert.deepEqual([state.dir, state.marker], [null, null]);
  await page.close();
});

test("keeps a dir value the site set after PromptRTL when turned off", async () => {
  const page = await browser.openPage("plain.html");
  const field = page.locator("#site-auto");
  await field.click();
  await page.keyboard.type("שלום");
  await field.evaluate((element) => element.setAttribute("dir", "ltr"));

  await browser.setSettings({ enabled: false });
  await page.waitForFunction(() => !document.querySelector("#site-auto").hasAttribute("data-promptrtl"), null, {
    timeout: 5000
  });
  assert.equal((await directionState(field)).dir, "ltr");
  await page.close();
});

test("re-applies the direction to the focused editor when turned back on", async () => {
  const page = await browser.openPage("plain.html");
  for (const selector of ["#textarea", "#shadow-textarea"]) {
    const field = page.locator(selector);
    await field.click();
    await page.keyboard.type("שלום");

    await browser.setSettings({ enabled: false });
    await page.bringToFront();
    await page.waitForFunction((element) => !element.hasAttribute("dir"), await field.elementHandle(), {
      timeout: 5000
    });
    await field.focus();

    await browser.setSettings({ enabled: true });
    await page.waitForFunction((element) => element.getAttribute("dir") === "rtl", await field.elementHandle(), {
      timeout: 5000
    });
  }
  await page.close();
});

test("ProseMirror composer: mention chips do not decide the prompt direction", async () => {
  const page = await browser.openPage("prosemirror.html");
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.evaluate(() => window.editor.insertMentionAtStart("@Claude"));
  await page.keyboard.press("End");
  await page.keyboard.type(" תסכם את המסמך");
  assert.equal(await page.evaluate(() => window.editor.text()), "@Claude תסכם את המסמך");
  assert.equal((await directionState(editor)).dir, "rtl");
  await page.close();
});

test("ProseMirror composer: lines without letters stay aligned with the editor", async () => {
  const page = await browser.openPage("prosemirror.html");
  await page.locator(".ProseMirror").click();
  await page.keyboard.type("רשימה");
  await page.keyboard.press("Enter");
  await page.keyboard.type("1. 2. 3.");
  const rightGaps = await page.evaluate(() =>
    [...document.querySelectorAll(".ProseMirror p")].map((paragraph) => {
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      return Math.round(paragraph.getBoundingClientRect().right - range.getBoundingClientRect().right);
    })
  );
  assert.deepEqual(rightGaps, [0, 0]);
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
