(function startPromptRTL() {
  "use strict";

  const core = globalThis.PromptRTLCore;
  const MARKER = "data-promptrtl";
  const IGNORE = "data-promptrtl-ignore";
  const textInputTypes = new Set(["text", "search"]);
  const managedElements = new Set();
  const elementReferences = new WeakMap();
  const elementFinalizer =
    typeof FinalizationRegistry === "function"
      ? new FinalizationRegistry((reference) => managedElements.delete(reference))
      : null;
  // The dir attribute each element had before PromptRTL changed it, and the
  // direction PromptRTL last applied.
  const appliedState = new WeakMap();
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

    if (!wasActive && active) {
      updateDirection(focusedEditor());
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

  function isSupportedField(element) {
    if (element instanceof HTMLTextAreaElement) {
      return !element.disabled && !element.readOnly;
    }

    return (
      element instanceof HTMLInputElement &&
      textInputTypes.has(element.type) &&
      !element.disabled &&
      !element.readOnly
    );
  }

  // Walks outward from an event target, through open shadow roots, to the
  // editor being typed in. Opted-out regions and non-editable islands are
  // boundaries: an edit inside them never affects an editor around them.
  function editorFromPath(path) {
    for (let index = 0; index < path.length; index++) {
      const node = path[index];
      if (!(node instanceof HTMLElement)) continue;
      if (node.hasAttribute(IGNORE)) return null;

      let editor = null;
      if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
        if (!isSupportedField(node)) return null;
        editor = node;
      } else if (node.contentEditable === "false") {
        return null;
      } else if (node.contentEditable === "true" || node.contentEditable === "plaintext-only") {
        editor = node;
      }

      if (editor) {
        const optedOut = path
          .slice(index + 1)
          .some((ancestor) => ancestor instanceof Element && ancestor.hasAttribute(IGNORE));
        return optedOut ? null : editor;
      }
    }

    return null;
  }

  function focusedEditor() {
    let element = document.activeElement;
    while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;

    const path = [];
    for (let node = element; node; node = node instanceof ShadowRoot ? node.host : node.parentNode) {
      path.push(node);
    }
    return editorFromPath(path);
  }

  // Finds the first strong character without copying the whole prompt, and
  // skips non-editable islands such as @-mention chips and file pills, whose
  // labels are not part of what the user is writing.
  function contentDirection(editor) {
    if (editor instanceof HTMLInputElement || editor instanceof HTMLTextAreaElement) {
      return core.firstStrongDirection(editor.value);
    }

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
        return node.contentEditable === "false" || node.hasAttribute(IGNORE)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_SKIP;
      }
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const direction = core.firstStrongDirection(node.data);
      if (direction) return direction;
    }

    return null;
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

    if (element.getAttribute("dir") === direction && element.getAttribute(MARKER) === direction) {
      return;
    }

    let state = appliedState.get(element);
    if (!state) {
      state = { hadDirection: element.hasAttribute("dir"), direction: element.getAttribute("dir") };
      appliedState.set(element, state);
      trackElement(element);
    }
    state.applied = direction;
    element.setAttribute("dir", direction);
    element.setAttribute(MARKER, direction);
  }

  function updateDirection(editor) {
    if (!active || !editor) return;

    // An empty or neutral editor keeps its current direction.
    applyDirection(editor, contentDirection(editor) || editor.getAttribute(MARKER));
  }

  function restoreElement(element) {
    const state = appliedState.get(element);
    if (!state) return;

    appliedState.delete(element);
    managedElements.delete(elementReferences.get(element));
    element.removeAttribute(MARKER);

    // If the site changed dir after PromptRTL did, the site's value wins.
    if (element.getAttribute("dir") !== state.applied) return;
    if (state.hadDirection) {
      element.setAttribute("dir", state.direction);
    } else {
      element.removeAttribute("dir");
    }
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

      // beforeinput exists to switch an empty or neutral editor before its
      // first letter appears. Once the text has a direction, input reconciles
      // it without doing the work twice for every keystroke.
      const editor = editorFromPath(event.composedPath());
      if (!editor || contentDirection(editor)) return;
      applyDirection(editor, core.firstStrongDirection(event.data));
    },
    true
  );

  document.addEventListener(
    "input",
    (event) => {
      if (!active || event.isComposing) return;
      updateDirection(editorFromPath(event.composedPath()));
    },
    true
  );

  document.addEventListener(
    "compositionend",
    (event) => {
      if (!active) return;
      updateDirection(editorFromPath(event.composedPath()));
    },
    true
  );

  document.addEventListener(
    "focusin",
    (event) => {
      if (!active) return;
      updateDirection(editorFromPath(event.composedPath()));
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
