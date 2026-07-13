# Privacy Policy

PromptRTL is designed to work entirely on the user's device.

## Data handling

The extension does **not** collect, transmit, sell, share, or remotely process
personal information, browsing history, prompt text, form contents, or usage
analytics.

To determine text direction, the extension reads the current contents of a
supported text editor while that page is open. The text is processed in memory
inside Chrome's isolated extension context. It is not logged, stored, copied to
the clipboard, or sent over the network.

## Local preferences

The extension stores only these preferences using `chrome.storage.local`:

- whether the extension is enabled;
- hostnames on which the user explicitly disabled the extension.

These preferences remain on the device and are not stored using Chrome Sync.
Removing the extension removes its local extension storage.

## Permissions

- **Read and change data on websites:** required to detect text direction and
  apply RTL/LTR styling to supported prompt boxes on HTTP and HTTPS pages.
- **Storage:** required for the global enabled setting and per-site exceptions.
- **Active tab:** used only when the user opens the extension popup, so the
  popup can show and update the setting for the current site.

The extension does not make network requests and contains no advertising,
analytics, remotely hosted code, or third-party dependencies.

## Changes

Privacy-relevant behavior changes will be documented in this repository and in
the extension's release notes.

## Contact

Privacy or security questions can be reported through this repository's issue
tracker.
