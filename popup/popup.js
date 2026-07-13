(function startPopup() {
  "use strict";

  const enabledToggle = document.querySelector("#enabled");
  const siteToggle = document.querySelector("#site-enabled");
  const hostnameLabel = document.querySelector("#hostname");
  const siteSetting = document.querySelector(".site-setting");
  let host = null;
  let settings = { enabled: true, disabledHosts: [] };

  function render() {
    enabledToggle.checked = settings.enabled;
    siteToggle.checked = host ? !settings.disabledHosts.includes(host) : false;
    siteToggle.disabled = !settings.enabled || !host;
    siteSetting.classList.toggle("disabled", siteToggle.disabled);
    hostnameLabel.textContent = host || "Unavailable on this page";
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
