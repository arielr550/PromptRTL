<p align="center">
  <img src="assets/logo.png" width="160" alt="PromptRTL logo" />
</p>

# PromptRTL

A small, private Manifest V3 Chrome extension that fixes text direction as you
type in AI chat boxes such as ChatGPT, Claude, and Gemini, as well as search
boxes, text areas, and other `contenteditable` editors.

It supports Hebrew, Arabic, Persian (Farsi), and Urdu. The popup is available
in those four languages, with English as the default fallback.

Direction detection recognizes Hebrew and Arabic scripts, including the
letters used in Persian and Urdu. It does not identify the language itself,
so text in other languages that share these scripts may also be directed RTL.

## Privacy first

All direction detection happens locally in the browser. Prompt text is never
logged, stored, or sent over the network. The only persisted data is the enabled
setting and hostnames the user explicitly disables, stored with
`chrome.storage.local` so they are not synced to a Google account.

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md) for the complete
permission rationale and security model.

## How it behaves

- A prompt whose first letter is from the Hebrew or Arabic script becomes
  right-to-left and right-aligned.
- A prompt whose first letter is from a left-to-right script (Latin, Cyrillic,
  Greek, CJK, and so on) stays left-to-right and left-aligned.
- Numbers, punctuation, and emoji are ignored when choosing the direction.
  Explicit RLM, ALM, and LRM marks are honored.
- English words, product names, and code inside an RTL prompt do not flip the
  whole box, and vice versa.
- Each editor has one direction, so lines holding only numbers or bullets stay
  aligned with the rest of the prompt.
- Non-editable chips inside an editor, such as @-mentions and attached-file
  pills, do not decide the direction.
- The direction stays in place while the box is temporarily empty, then follows
  the next first letter you type.
- Password, email, URL, telephone, and number inputs are deliberately ignored.
- The popup can turn PromptRTL off everywhere or only on the current site.
  Turning it off restores each box's original direction.

The extension cannot know the active keyboard layout before a character is
typed; browsers intentionally do not expose that reliably. It uses
`beforeinput` to recognize the first letter before it is inserted, which makes
the switch feel immediate.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Choose this project folder, or `dist/promptrtl` after running
   `npm run package`.
5. Open an AI site, refresh its tab once, and type in a prompt box.

Changes to this project require clicking the extension's **Reload** button on
`chrome://extensions`, then refreshing the page being tested.

## Development

The extension has no build step and no runtime dependencies. The development
dependencies (Playwright, ProseMirror, and Quill) are used only by the tests.

```sh
npm install
npm test                         # direction, translation, security, and packaging checks
npx playwright install chromium  # once, for the browser tests
npm run test:e2e                 # loads the packaged extension into Chromium
npm run package                  # writes dist/promptrtl/ and dist/promptrtl-<version>.zip
```

The browser tests type Hebrew, Arabic, Persian, and Urdu into plain fields, a
text area inside open shadow DOM, a ProseMirror composer (the editor family
behind ChatGPT's and Claude's prompt boxes), and a Quill composer (used by
Gemini). Set `HEADED=1` to watch them run. They use local copies of those
editors, so a quick manual check on the live sites is still worthwhile before a
release.

Sites can opt an individual editor out by adding the `data-promptrtl-ignore`
attribute to it or an ancestor.

## Current limits

- Chrome blocks extensions on internal pages such as `chrome://` and the Chrome
  Web Store.
- Editors embedded inside iframes are not processed, which keeps PromptRTL from
  loading separately in every ad, widget, and embedded page while browsing.
- Inputs inside closed shadow DOM cannot be reached by content scripts. Inside
  open shadow DOM, PromptRTL sets the `dir` attribute, but its alignment styles
  cannot reach in, so the site's own styling for that direction applies.
- Each editor has a single direction. A line in another language keeps the
  editor's direction on screen (for example, an English line in a Hebrew prompt
  is right-aligned); the text sent to the AI is unaffected.
- The direction updates when you type in or focus a box. If a site replaces the
  text on its own, such as clearing the box after sending, the previous
  direction stays until your next keystroke.

## License

[MIT](LICENSE)
