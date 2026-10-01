# PromptRTL

A personal, lightweight Chrome extension for typing Hebrew and English in AI
prompt boxes, search fields, textareas, and editable text on websites.

The first letter sets the direction: Hebrew is right-to-left, English is
left-to-right. Numbers, punctuation, and emoji do not decide the direction.
Mixed prompts keep the direction of their first letter, and an empty box keeps
its last direction until you type a new letter. Explicit RLM/LRM marks work too.
The popup is always in Hebrew.

## Install and use

1. Keep this folder on the Mac where Chrome runs. If it is only on `cosmos`,
   copy it to the Mac first; Chrome needs a local folder.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select this project folder.
4. Refresh any already-open tabs and start typing.

Use the popup to turn the extension off globally or for the current hostname.
Turning it off restores the editors' original direction. After changing files,
click **Reload** on `chrome://extensions` and refresh the affected tabs.
No build or dependency installation is needed to use the extension.

## Privacy and permissions

Text stays in memory on your device: no logging, network requests, analytics,
or runtime dependencies. Only the enabled setting and disabled hostnames are
saved in `chrome.storage.local` (not Chrome Sync).

The extension runs on HTTP/HTTPS pages so it works across AI tools and other
text fields. `storage` saves preferences; `activeTab` lets the popup identify
the current site. Password, email, URL, telephone, numeric, disabled, and
read-only fields are ignored. Sites can also opt out an editor or an ancestor
with `data-promptrtl-ignore`.

## Limits

- Chrome blocks extensions on its internal pages and protected websites.
- Editors in iframes and closed shadow DOM are not processed.
- Inside open shadow DOM, direction is set, but alignment follows site styles.
- Each editor has one direction; individual lines do not switch independently.
- Direction updates on typing or focus. Programmatic text changes are reconciled
  on the next input or focus event.
- Detection identifies Hebrew characters, not the language itself. Other text
  written with the same characters can also trigger RTL.

## Optional development checks

```sh
npm ci
npm test
npx playwright install chromium  # once, for browser tests
npm run test:e2e
```

Browser tests load this folder directly into Chromium and exercise plain fields,
open shadow DOM, ProseMirror, Quill, and the popup. These development dependencies
are used only for tests. The automated checks also run on pull requests.

[MIT license](LICENSE).
