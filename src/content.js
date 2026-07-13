(function startInputDirectionHelper() {
  "use strict";

  const core = globalThis.RTLInputDirection;
  const managedElements = new Set();
  const originalState = new WeakMap();
  const textInputTypes = new Set(["", "text", "search"]);
  let settings = {
    enabled: true,
    disabledHosts: []
  };
  // Start with the documented default so an unusually fast first keystroke is
  // never missed while Chrome retrieves local settings. If the stored setting
  // is disabled, loadSettings() immediately restores anything touched.
  let active = true;

  function currentHost() {
    return window.location.hostname;
  }

  function refreshActiveState() {
    const wasActive = active;
    active = settings.enabled && !settings.disabledHosts.includes(currentHost());

    if (wasActive && !active) {
      restoreAllElements();
    }

    if (!wasActive && active && document.activeElement) {
      const element = editableFromNode(document.activeElement);
      if (element) updateDirection(element);
    }
  }

  function loadSettings() {
    chrome.storage.local.get(
      { enabled: true, disabledHosts: [] },
      (storedSettings) => {
        settings = {
          enabled: storedSettings.enabled !== false,
          disabledHosts: Array.isArray(storedSettings.disabledHosts)
            ? storedSettings.disabledHosts
            : []
        };
        refreshActiveState();
      }
    );
  }

  function isEditable(element) {
    if (!(element instanceof Element) || element.closest("[data-input-direction-helper-ignore]")) {
      return false;
    }

    if (element instanceof HTMLTextAreaElement) {
      return !element.disabled && !element.readOnly;
    }

    if (element instanceof HTMLInputElement) {
      return textInputTypes.has(element.type) && !element.disabled && !element.readOnly;
    }

    return (
      (element.hasAttribute("contenteditable") && element.contentEditable !== "false") ||
      element.getAttribute("role") === "textbox"
    );
  }

  function editableFromNode(node) {
    if (!(node instanceof Element)) return null;

    if (isEditable(node)) return node;

    const editableParent = node.closest(
      'textarea, input, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'
    );
    return editableParent && isEditable(editableParent) ? editableParent : null;
  }

  function editableFromEvent(event) {
    for (const node of event.composedPath()) {
      const editable = editableFromNode(node);
      if (editable) return editable;
    }

    return null;
  }

  function textOf(element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element.value;
    }

    return element.innerText || element.textContent || "";
  }

  function rememberOriginalState(element) {
    if (originalState.has(element)) return;

    originalState.set(element, {
      hadDirection: element.hasAttribute("dir"),
      direction: element.getAttribute("dir")
    });
  }

  function applyDirection(element, direction) {
    if (!direction || !active) return;

    rememberOriginalState(element);
    managedElements.add(element);
    element.setAttribute("dir", direction);
    element.setAttribute("data-input-direction-helper", direction);
  }

  function updateDirection(element, insertedText = "") {
    if (!active || !element) return;

    const direction = core.directionForEdit(
      textOf(element),
      insertedText,
      element.getAttribute("data-input-direction-helper")
    );
    applyDirection(element, direction);
  }

  function restoreElement(element) {
    const original = originalState.get(element);
    if (!original) return;

    element.removeAttribute("data-input-direction-helper");
    if (original.hadDirection) {
      element.setAttribute("dir", original.direction);
    } else {
      element.removeAttribute("dir");
    }
    managedElements.delete(element);
  }

  function restoreAllElements() {
    for (const element of managedElements) {
      restoreElement(element);
    }
  }

  document.addEventListener(
    "beforeinput",
    (event) => {
      if (event.isComposing) return;
      updateDirection(editableFromEvent(event), event.data || "");
    },
    true
  );

  document.addEventListener(
    "input",
    (event) => {
      if (event.isComposing) return;
      updateDirection(editableFromEvent(event));
    },
    true
  );

  document.addEventListener(
    "compositionend",
    (event) => updateDirection(editableFromEvent(event)),
    true
  );

  document.addEventListener(
    "focusin",
    (event) => updateDirection(editableFromEvent(event)),
    true
  );

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;

    if (changes.enabled) settings.enabled = changes.enabled.newValue !== false;
    if (changes.disabledHosts) {
      settings.disabledHosts = Array.isArray(changes.disabledHosts.newValue)
        ? changes.disabledHosts.newValue
        : [];
    }
    refreshActiveState();
  });

  loadSettings();
})();
