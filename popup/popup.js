(function startPopup() {
  "use strict";

  const enabledToggle = document.querySelector("#enabled");
  const siteToggle = document.querySelector("#site-enabled");
  const hostnameLabel = document.querySelector("#hostname");
  const siteSetting = document.querySelector(".site-setting");
  let host = null;
  let settings = { enabled: true, disabledHosts: [] };

  // Direction and language come from the locale whose messages Chrome chose,
  // so an unsupported RTL browser language never shows English laid out RTL.
  function localize() {
    document.documentElement.lang = chrome.i18n.getMessage("languageCode");
    document.documentElement.dir = chrome.i18n.getMessage("textDirection");
    for (const element of document.querySelectorAll("[data-i18n]")) {
      element.textContent = chrome.i18n.getMessage(element.dataset.i18n);
    }
  }

  function render() {
    enabledToggle.checked = settings.enabled;
    enabledToggle.disabled = false;
    siteToggle.checked = host ? !settings.disabledHosts.includes(host) : false;
    siteToggle.disabled = !settings.enabled || !host;
    siteSetting.classList.toggle("disabled", siteToggle.disabled);
    hostnameLabel.textContent = host || chrome.i18n.getMessage("siteUnavailable");
  }

  function save(patch) {
    settings = { ...settings, ...patch };
    chrome.storage.local.set(patch);
    render();
  }

  enabledToggle.addEventListener("change", () => {
    save({ enabled: enabledToggle.checked });
  });

  siteToggle.addEventListener("change", () => {
    const disabledHosts = new Set(settings.disabledHosts);
    if (siteToggle.checked) {
      disabledHosts.delete(host);
    } else {
      disabledHosts.add(host);
    }
    save({ disabledHosts: [...disabledHosts] });
  });

  localize();

  Promise.all([
    chrome.storage.local.get({ enabled: true, disabledHosts: [] }),
    chrome.tabs.query({ active: true, currentWindow: true })
  ]).then(([storedSettings, tabs]) => {
    settings = {
      enabled: storedSettings.enabled !== false,
      disabledHosts: Array.isArray(storedSettings.disabledHosts)
        ? storedSettings.disabledHosts
        : []
    };
    try {
      const url = new URL(tabs[0].url);
      if (url.protocol === "http:" || url.protocol === "https:") host = url.hostname;
    } catch (_error) {
      host = null;
    }
    render();
  });
})();
