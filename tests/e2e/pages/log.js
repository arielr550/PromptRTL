// Records the editor direction page scripts observe as each edit begins, after
// PromptRTL's capture-phase listener has had its chance to run.
window.inputLog = [];
document.addEventListener("beforeinput", (event) => {
  const target = event.composedPath()[0];
  window.inputLog.push({
    inputType: event.inputType,
    data: event.data,
    dir: target instanceof Element ? target.getAttribute("dir") : null
  });
});
