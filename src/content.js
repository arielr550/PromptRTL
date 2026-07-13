(function startInputDirectionHelper() {
  "use strict";

  const core = globalThis.RTLInputDirection;
  const managedElements = new Set();
  const elementReferences = new WeakMap();
  const elementFinalizer =
    typeof FinalizationRegistry === "function"
      ? new FinalizationRegistry((reference) => managedElements.delete(reference))
      : null;
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

    // textContent does not require the browser to calculate layout. Direction
    // detection only needs character order, not rendered line breaks.
    return element.textContent || "";
  }

  function rememberOriginalState(element) {
    if (originalState.has(element)) return;

    originalState.set(element, {
      hadDirection: element.hasAttribute("dir"),
      direction: element.getAttribute("dir")
    });
  }

  function trackElement(element) {
    let reference = elementReferences.get(element);
    if (!reference) {
      reference = new WeakRef(element);
      elementReferences.set(element, reference);
      elementFinalizer?.register(element, reference);
    }
    managedElements.add(reference);
  }

  function applyDirection(element, direction) {
    if (!direction || !active) return;

    if (
      element.getAttribute("dir") === direction &&
      element.getAttribute("data-input-direction-helper") === direction
    ) {
      return;
    }

    rememberOriginalState(element);
    trackElement(element);
    element.setAttribute("dir", direction);
    element.setAttribute("data-input-direction-helper", direction);
  }

  function updateDirection(element, insertedText = "", currentText) {
    if (!active || !element) return;

    const direction = core.directionForEdit(
      currentText === undefined ? textOf(element) : currentText,
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
    const reference = elementReferences.get(element);
    if (reference) managedElements.delete(reference);
  }

  function restoreAllElements() {
    for (const reference of managedElements) {
      const element = reference.deref();
      if (element) restoreElement(element);
      else managedElements.delete(reference);
    }
  }

  document.addEventListener(
    "beforeinput",
    (event) => {
      if (!active || event.isComposing || !event.data) return;

      const element = editableFromEvent(event);
      if (!element) return;

      // beforeinput exists to switch an empty/neutral editor before its first
      // strong character appears. Once text has a direction, input will handle
      // reconciliation without doing the work twice for every keystroke.
      const currentText = textOf(element);
      if (core.firstStrongDirection(currentText)) return;
      updateDirection(element, event.data, currentText);
    },
    true
  );

  document.addEventListener(
    "input",
    (event) => {
      if (!active || event.isComposing) return;
      updateDirection(editableFromEvent(event));
    },
    true
  );

  document.addEventListener(
    "compositionend",
    (event) => {
      if (!active) return;
      updateDirection(editableFromEvent(event));
    },
    true
  );

  document.addEventListener(
    "focusin",
    (event) => {
      if (!active) return;
      updateDirection(editableFromEvent(event));
    },
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
