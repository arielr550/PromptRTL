# Security Policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub's **Report a
vulnerability** feature when available. Do not include sensitive prompt text,
credentials, or personal data in a public issue.

## Security design

Input Direction Helper intentionally has a small attack surface:

- all executable code ships inside the extension;
- Manifest V3 and an explicit Content Security Policy disallow remote scripts,
  inline scripts, dynamic code evaluation, and plugin objects;
- there are no runtime dependencies, network requests, analytics, background
  services, or externally connectable APIs;
- prompt contents are processed only in memory and are never persisted;
- preferences use device-local storage rather than Chrome Sync;
- password, email, URL, telephone, and numeric inputs are excluded;
- extension DOM updates use fixed attributes and `textContent`, not HTML
  injection.

## Permission rationale

The extension must run on HTTP and HTTPS pages to work across AI tools and search
interfaces. It reacts only to focus and input events in supported text editors.
Chrome internal pages, the Chrome Web Store, and closed shadow DOM remain outside
its reach.

Per-site access would reduce the initial permission warning but would require
users to grant each site manually. The broad match pattern is a product tradeoff,
not a data-collection mechanism; the extension has no code path that transmits
page data.

## Maintainer checklist

Before release:

1. Run `node --test tests/*.test.js`.
2. Run syntax checks on all JavaScript files and validate `manifest.json`.
3. Search for newly introduced network APIs, remote URLs, dynamic code execution,
   HTML injection, dependencies, and additional permissions.
4. Review the complete packaged extension rather than only the source diff.
