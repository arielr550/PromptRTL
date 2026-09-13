"use strict";

// Launches Chromium with the packaged extension (exactly the files that ship)
// and serves local editor fixtures over HTTP, where the content script runs.

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");
const { stageExtension } = require("../../scripts/package.js");

const root = path.resolve(__dirname, "../..");
const servedAreas = {
  pages: path.join(__dirname, "pages"),
  node_modules: path.join(root, "node_modules")
};
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json"
};

function startServer() {
  const server = http.createServer((request, response) => {
    const [, area, ...parts] = new URL(request.url, "http://localhost").pathname.split("/");
    const base = Object.hasOwn(servedAreas, area) ? servedAreas[area] : null;
    const file = base && path.join(base, ...parts.map(decodeURIComponent));

    if (!file || !file.startsWith(base + path.sep) || !fs.statSync(file, { throwIfNoEntry: false })?.isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": contentTypes[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// Chrome derives an unpacked extension's ID from its absolute directory path.
function unpackedExtensionId(directory) {
  const hash = crypto.createHash("sha256").update(directory).digest("hex").slice(0, 32);
  return hash.replace(/[0-9a-f]/g, (digit) => String.fromCharCode(97 + parseInt(digit, 16)));
}

async function launchBrowser({ locale } = {}) {
  const { outputDirectory } = stageExtension(path.join(root, "dist", "e2e", "promptrtl"));
  const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "promptrtl-e2e-"));
  const server = await startServer();
  const args = [
    `--disable-extensions-except=${outputDirectory}`,
    `--load-extension=${outputDirectory}`
  ];
  if (locale) args.push(`--lang=${locale}`);

  const context = await chromium.launchPersistentContext(userDataDirectory, {
    channel: "chromium",
    headless: !process.env.HEADED,
    locale,
    args
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const extensionId = unpackedExtensionId(outputDirectory);

  const browser = {
    context,
    origin,
    extensionId,

    async openPage(name) {
      const page = await context.newPage();
      await page.goto(`${origin}/pages/${name}`);
      await page.waitForFunction(() => window.ready === true);
      return page;
    },

    async openPopup() {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
      return page;
    },

    async setSettings(settings) {
      const popup = await browser.openPopup();
      await popup.evaluate((values) => chrome.storage.local.set(values), settings);
      await popup.close();
    },

    async close() {
      await context.close();
      server.close();
      fs.rmSync(userDataDirectory, { recursive: true, force: true });
    }
  };
  return browser;
}

// Reads what the page sees on an element: attributes plus the rendered result.
function directionState(locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      dir: element.getAttribute("dir"),
      marker: element.getAttribute("data-promptrtl"),
      direction: style.direction,
      textAlign: style.textAlign,
      unicodeBidi: style.unicodeBidi
    };
  });
}

module.exports = { launchBrowser, directionState };
