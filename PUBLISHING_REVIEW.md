# Chrome Web Store readiness review

Reviewed on 2026-10-01. Assessment: close to ready, but finish the submission
materials and address the launch usability issues below before publishing.
This review does not establish the status of any existing Developer Dashboard
listing, publisher account, or authenticated live-site testing.

## Changes completed

- Supported language names and all localized descriptions now specify Hebrew,
  Arabic, Persian (Farsi), and Urdu only.
- Direction detection now recognizes Hebrew and Arabic Unicode script letters,
  including Persian/Urdu letters and presentation forms, instead of broad ranges
  that included unrelated scripts.
- The four RTL popup locales remain, with English as the default fallback.
- Tests cover the supported languages and exclusion of unrelated script letters.

This is script detection, not language identification: other languages using
the same Hebrew/Arabic letters can still receive RTL direction. Deliberate
direction marks continue to work. Letters outside the supported scripts follow
the detector's existing LTR fallback.

## Before publishing

1. **Prepare the missing store materials.** The repository has correctly sized
   extension icons, but no store screenshot set, 440x280 promotional tile, or
   dedicated long listing description. Supply at least one screenshot showing
   the actual extension experience (1280x800 preferred; 640x400 also accepted)
   and the small promotional image. Explain automatic direction, the four
   languages, local processing, site controls, and current limitations. A video
   and marquee image are optional. See Google's [image requirements](https://developer.chrome.com/docs/webstore/images)
   and [listing guide](https://developer.chrome.com/docs/webstore/cws-dashboard-listing).

2. **Finish the privacy submission.** `PRIVACY.md` accurately describes local
   editor processing and preferences. Provide its public URL in the dashboard,
   complete the single-purpose statement, permission justifications, remote-code
   declaration (none), and data-use certification. Explicitly describe local
   text processing and saved site exceptions; Google requires disclosures even
   for local-only handling. Add an explicit Limited Use compliance statement and
   a direct support/privacy contact link to the policy. See the [privacy fields
   guide](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) and
   [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

3. **Fix the popup's unavailable-page handling.** `popup/popup.js:63-64` accepts
   all HTTP(S) hosts. On `chromewebstore.google.com`, it therefore offers a checked,
   enabled site switch even though Chrome blocks content scripts there. A VM
   reproduction of the current popup confirms this state. Exclude current and
   legacy Store pages, and test the result. Also make it clear when Chrome's
   site-access setting prevents the extension from working.

4. **Add installation guidance.** The README tells developers to refresh tabs,
   but the popup does not tell ordinary users. Add a short translated instruction
   to refresh already-open tabs after installation. Otherwise a user can install
   the extension, return to an existing AI tab, and conclude that it is broken.

5. **Verify the actual sites and complete coverage.** Browser tests cover local
   plain fields, ProseMirror, and Quill; they do not prove live-site compatibility.
   Check all four languages in current ChatGPT, Claude, and Gemini with the
   packaged extension, including paste, mixed English, multiple lines, undo,
   submission/clearing, and both toggles. Test popup operation while an HTTP tab
   is active (the current tests open it as the active extension tab), plus Persian
   and Urdu rendering and blocked pages. An unauthenticated ChatGPT page inspected
   during this review used a textarea; editor implementations can vary by session.

6. **Make the access scope clear.** `manifest.json:30-32` injects on every HTTP(S)
   website and processes supported fields beyond AI prompts. If that is the
   intended feature, explain it in the listing and justify the broad access.
   If the product is intended only for selected AI sites, narrow the matches.
   Google's policy requires the [minimum permissions necessary](https://developer.chrome.com/docs/webstore/program-policies/permissions).
   Broad access is a review consideration, not an automatic rejection.

## Lower-priority improvements

- Handle rejected storage/tab API promises in `popup/popup.js:30-33,52-69` so
  failed reads do not leave controls disabled without explanation and failed
  writes do not appear saved.
- Consider the store icon padding guidelines: the current 128x128 image has an
  opaque background to its edges; Google recommends transparent padding around
  square artwork. The existing dimensions and PNG format are correct.
- Track the low-severity [Quill 2.0.3 HTML-export advisory](https://github.com/advisories/GHSA-v3m3-f69x-jf25).
  Quill is a test dependency and is excluded from the extension ZIP. The advisory
  currently lists no patched release; do not blindly apply the suggested forced
  downgrade. This does not expose extension users to the test dependency.

## Verification completed

- `npm test`: 40 passing unit, translation, syntax, static security, and
  package-content checks.
- `npm run test:e2e`: 18 passing packaged-extension Chromium browser tests.
- `npm run package`: 16 runtime files in `dist/promptrtl-0.1.0.zip`.
- `unzip -t dist/promptrtl-0.1.0.zip`: all archive entries passed integrity checks.
- `npm audit --omit=dev`: zero vulnerabilities. Full audit: one low-severity,
  development-only Quill advisory.
- Runtime inspection: Manifest V3, restrictive extension-page CSP, no runtime
  dependencies, network calls, analytics, remote scripts, or prompt persistence.

The documented iframe, closed-shadow-DOM, and per-editor direction limitations
are reasonable for an initial release if the store description sets expectations.
