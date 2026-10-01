const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { launchBrowser } = require("./harness.js");

let browser;
before(async () => {
  browser = await launchBrowser();
});
after(async () => {
  await browser?.close();
});

test("shows Hebrew controls in RTL and saves the global toggle", async () => {
  const popup = await browser.openPopup();
  const enabled = popup.locator("#enabled");
  const site = popup.locator("#site-enabled");

  await popup.waitForFunction(() => document.querySelector("#enabled").checked);
  assert.equal(await popup.evaluate(() => document.documentElement.dir), "rtl");
  assert.equal(await popup.evaluate(() => document.documentElement.lang), "he");
  assert.equal(await popup.locator(".setting strong").first().textContent(), "התוסף פעיל");
  // The popup itself is the active tab here, so there is no website to toggle.
  assert.equal(await site.isDisabled(), true);
  assert.equal(await popup.locator("#hostname").textContent(), "לא זמין בדף זה");

  await enabled.click();
  assert.equal(await popup.evaluate(() => chrome.storage.local.get("enabled").then((s) => s.enabled)), false);

  await enabled.click();
  assert.equal(await popup.evaluate(() => chrome.storage.local.get("enabled").then((s) => s.enabled)), true);
  await popup.close();
});
