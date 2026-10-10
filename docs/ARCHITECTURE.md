# Architecture and verification

FarsiFlow is a Manifest V3 extension without a production build system or remote runtime dependencies.

## Trust boundaries

- Popup/options own explicit permission requests. Only specific domain patterns are requested. Broad patterns appear only in optional_host_permissions so users can add arbitrary domains.
- Background reconciles dynamic content-script registrations against the currently granted origins. Open tabs are checked for persistent permission before manual injection.
- Permission checks use the actual content-script sender URL, never a URL supplied by a webpage/message.
- Content scripts run in the default isolated world and check persistent permission before processing text. Repeated injection reuses the same engine.
- Chrome local storage holds settings and imported fonts. No fetch goes to a public service; fetch in the engine retrieves packaged fonts via chrome.runtime.getURL. Custom font bytes are loaded from local storage into FontFace.
- The only web-accessible packaged resources are the openly licensed bundled fonts, not scripts, settings or imported fonts.

## Presentation engine

Constructed stylesheets target attributes owned by the extension. Arabic-script glyph coverage uses unicodeRange. The original font-family is kept as the Latin fallback. The base font size is read after removing previous owned styling so a 120% multiplier cannot compound.

Direction inference counts strong letters, ignores punctuation/digits and uses Persian-specific letters as a tie-breaker. Manual modes include first-strong-letter, RTL for Arabic-script prose, and font-only. The Arabic script test includes Persian but cannot perfectly separate Persian, Arabic and Urdu; it is a direction heuristic rather than a language classifier.

No text nodes are replaced and no bdi wrappers/control characters are inserted. Existing inline Latin markup, links and technical elements get direction isolation. General layouts and table column order are not reversed. Editor value/caret APIs are never written; editor dir metadata is temporarily changed. Restoration does not overwrite a host application property if it has changed since the extension's last write.

The MutationObserver responds to character data, added/removed children and class/lang changes. Elements are processed in frame batches of 180. Detached elements are pruned from the restoration map. The initial traversal still creates a list of descendants; this is suitable for ordinary message pages, but very large/virtualized pages should be profiled before claiming a performance budget. Streaming callbacks do not request a full conversation rescan solely because a token was appended.

## Testing status

- 10 Node tests: settings, domain validation, bidi modes, backup/font validation, mocked background registration, sender trust, installation and revocation.
- 22 actual Chromium renderer checks: CSS direction, glyph range, code/formula/link isolation, source-text preservation, inputs, streaming, mutation scale stability, exclusions, cleanup, reinjection, controlled adapter fixtures, strict style/font CSP, custom-font bytes, UI saves, user-gesture permission request, font upload and demo text preservation.
- Browser: Chrome Headless Shell 143.0.7499.4. The renderer test uses mocked extension APIs. The mock does not prove native API compatibility or real permission prompt behavior.
- A native MV3 integration suite is supplied in tests/browser.cjs but could not run in the execution environment: full Chrome startup required an unavailable native Unix socket. This limitation was not bypassed. Native extension loading, real service-worker behavior and authenticated ChatGPT/Gemini/Claude sessions remain unverified.
- Store assets are actual screenshots of the packaged HTML UI using local test data, plus a brand promotional graphic. They are not screenshots of live AI services.

## Known boundaries

Closed and open Shadow DOM are not traversed in this version. Inaccessible iframes, images, canvas, built-in PDFs, Chrome internal pages and the Chrome Web Store cannot be restyled. SPA structures/selectors may change. Direction inference may need a manual mode for ambiguous prose. Raw unmarked Latin runs use Chromium's Unicode bidi algorithm. A missing/invalid custom font falls back to Vazirmatn. A static custom font file represents one selected entry/weight; variable fonts can expose their weight range.

## Releasing

Run both renderer and native browser suites in a normal desktop Chrome-capable environment. Manually verify requested host scopes, browser restart persistence, actual AI composers/streaming, selection/copy and IME, revoke/disable behavior, high zoom and screen-reader navigation. Provide the publisher's contact details and public privacy-policy URL. Upload only dist/FarsiFlow-1.0.0-Chrome.zip; neither package creation nor this document implies store approval.
