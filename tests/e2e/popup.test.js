const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { launchBrowser } = require("./harness.js");

let browser;
before(async () => {
  browser = await launchBrowser();
});
after(async () => {
  await browser?.close();
});

test("shows the stored settings and saves the global toggle", async () => {
  const popup = await browser.openPopup();
  const enabled = popup.locator("#enabled");
  const site = popup.locator("#site-enabled");

  await popup.waitForFunction(() => document.querySelector("#enabled").checked);
  assert.equal(await popup.evaluate(() => document.documentElement.dir), "ltr");
  assert.equal(await popup.locator("[data-i18n=popupTagline]").textContent(), "Private RTL typing for AI chats");
  // The popup itself is the active tab here, so there is no website to toggle.
  assert.equal(await site.isDisabled(), true);
  assert.equal(await popup.locator("#hostname").textContent(), "Unavailable on this page");

  await enabled.click();
  assert.equal(await popup.evaluate(() => chrome.storage.local.get("enabled").then((s) => s.enabled)), false);

  await enabled.click();
  assert.equal(await popup.evaluate(() => chrome.storage.local.get("enabled").then((s) => s.enabled)), true);
  await popup.close();
});

for (const [locale, enabledLabel] of [
  ["he", "התוסף פעיל"],
  ["ar", "الإضافة مفعّلة"]
]) {
  test(`shows the popup in ${locale} with right-to-left layout`, async () => {
    const localized = await launchBrowser({ locale });
    try {
      const popup = await localized.openPopup();
      await popup.waitForFunction(() => !document.querySelector("#enabled").disabled);
      assert.equal(await popup.evaluate(() => document.documentElement.dir), "rtl");
      assert.equal(await popup.evaluate(() => document.documentElement.lang), locale);
      assert.equal(await popup.locator("[data-i18n=enabledLabel]").textContent(), enabledLabel);
      const screenshots = path.resolve(__dirname, "../../test-results");
      fs.mkdirSync(screenshots, { recursive: true });
      await popup.screenshot({ path: path.join(screenshots, `popup-${locale}.png`) });
    } finally {
      await localized.close();
    }
  });
}
