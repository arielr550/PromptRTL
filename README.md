<p align="center">
  <img src="assets/logo.png" width="160" alt="PromptRTL logo" />
</p>

# PromptRTL

A small Manifest V3 Chrome extension that automatically fixes text direction in
AI prompts, search boxes, text areas, and `contenteditable` prompt editors.

It was designed for Hebrew, and also recognizes the common Arabic-family RTL
Unicode ranges.

## Privacy first

All direction detection happens locally in the browser. Prompt text is never
logged, stored, or sent over the network. The only persisted data is the enabled
setting and hostnames the user explicitly disables, stored with
`chrome.storage.local` so they are not synced to a Google account.

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md) for the complete
permission rationale and security model.

## How it behaves

- A prompt whose first letter is Hebrew becomes right-to-left and right-aligned.
- A prompt whose first letter is Latin remains left-to-right and left-aligned.
- Numbers and punctuation are ignored when deciding direction.
- English words inside a Hebrew prompt do not make the entire field jump back to
  LTR (and vice versa).
- The selected direction stays in place if the field is temporarily empty.
- Password, email, URL, telephone, and number inputs are deliberately ignored.
- The popup can disable the helper globally or only on the current site.

The extension cannot know the active macOS/Windows keyboard layout before a
character is typed; browsers intentionally do not expose that reliably. It uses
`beforeinput` to recognize the first Hebrew character before it is inserted,
which makes the switch feel immediate.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Choose this project folder.
5. Open an AI site, refresh its tab once, and type in a prompt box.

Changes to this project require clicking the extension's **Reload** button on
`chrome://extensions`, then refreshing the page being tested.

## Development

No build step and no dependencies are required.

Run the direction tests with:

```sh
node --test tests/*.test.js
```

Sites can opt an individual editor out by adding the
`data-input-direction-helper-ignore` attribute to it or an ancestor.

## Current limits

- Chrome blocks extensions on internal pages such as `chrome://` and the Chrome
  Web Store.
- Editors embedded inside iframes are not processed, which keeps PromptRTL from
  loading separately in every ad, widget, and embedded page while browsing.
- Inputs inside closed shadow DOM cannot be reached by content scripts.
- This first version chooses one base direction per editor. Multi-paragraph
  editors with a different language per paragraph are a possible follow-up.
