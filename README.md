# Tasks

A responsive to-do list in plain HTML, CSS, and JavaScript. No framework, no build step, no dependencies — three files and a browser. Tasks live in `localStorage`, so they survive a refresh without an account or a server.

Styled with the Mintlify design system: white canvas, near-black text, a single mint accent used only for active states, and one illustrated hero band as the sole colored surface.

## Quick start

```bash
git clone https://github.com/ChrisinBarcelona/todo.git
cd todo
python3 -m http.server 8000     # or: npx serve .
```

Then open <http://localhost:8000>.

Opening `index.html` directly also works in Chrome and Firefox, but Safari blocks `localStorage` on `file://` URLs, so tasks won't persist there. The local server avoids that.

To deploy, upload the three files to any static host (GitHub Pages, Netlify, S3) — there is nothing to build.

## Features

| Feature | How it works |
|---|---|
| **Add** | Type in the field and press <kbd>Enter</kbd> or click **Add task**. Blank and whitespace-only entries are ignored. |
| **Edit** | Double-click a task's text, or click the pencil icon. Save with <kbd>Enter</kbd> or by clicking away; discard with <kbd>Esc</kbd>. Clearing the field reverts rather than deletes. |
| **Delete** | Click the trash icon on the row. |
| **Complete** | Tick the checkbox — the text gets a strikethrough and the remaining count updates. |
| **Clear all** | Click **Clear all** and confirm in the dialog. <kbd>Esc</kbd> or **Cancel** backs out; nothing is deleted until you confirm. |
| **Persistence** | Every change is written to `localStorage` immediately and restored on load. |

## Keyboard

| Key | Where | Action |
|---|---|---|
| <kbd>Enter</kbd> | New-task field | Add the task |
| <kbd>Enter</kbd> | Inline editor | Save the change |
| <kbd>Esc</kbd> | Inline editor | Discard the change |
| <kbd>Esc</kbd> | Confirm dialog | Cancel, keeping every task |
| <kbd>Tab</kbd> | Anywhere | Move through controls; focus is always visible |

Every control is reachable by keyboard, icon buttons carry `aria-label`s naming their task, and changes are announced through a polite live region.

## Files

```
index.html    Markup, the hero illustration (inline SVG), and the confirm dialog
styles.css    Design tokens and all styling
app.js        State, localStorage, rendering, and event handling
```

## Data

Tasks are stored under the key `tasks.v1` as an array of `{ id, text, done }`:

```json
[{ "id": "9f1c…", "text": "Book flights to Barcelona", "done": false }]
```

Storage is read defensively: corrupt or non-conforming JSON is discarded and the app starts empty rather than throwing. If storage is unavailable (private mode, quota), the app still runs in-memory and says so.

To reset manually, run `localStorage.removeItem('tasks.v1')` in the console, or use **Clear all**.

Task text is written with `textContent` and `value` only — never `innerHTML` — so markup typed into a task is stored and displayed as literal text.

## Design notes

Tokens in `styles.css` come from the Mintlify style reference: Mint Green `#0c8c5e`, Ink Black `#08090a`, Paper White `#ffffff`, Mist Gray `#f2f2f2`, Cloud Gray `#dddddd`; Inter throughout with `ss01`/`cv11` on; 4px controls, 16px cards; shadows capped at a 2px offset at 3–5% opacity.

The reference's layout DNA — a floating product card overlapping the hero's bottom edge — is applied literally: the task list *is* that card. Mint appears only on active states, the eyebrow labels, and the checked checkbox; the single dark filled button is Ink Black.

Three deliberate departures from the reference, all noted rather than silent:

- **Card shadow.** The reference lists it as `lab(100 0 0 / 0.05)` — pure white, invisible on a white canvas. The ink equivalent at 5% is used instead, matching the stated "2px offset at 3–5%" rule.
- **Hero surface.** Listed as `#0c8c5` — a five-digit hex. Read as the mint `#0c8c5e` and used as the base of the hero's teal-to-mint gradient.
- **Eyebrow contrast.** Mint on white is 4.26:1, just under WCAG AA's 4.5:1 for 13px text. The brand token is kept as specified; darkening the eyebrow to `#0a7a52` clears AA if accessibility should win over exact brand fidelity. The other derived grays were tuned to clear 4.5:1.

The cloud illustration is inline SVG, drawn from one reusable cumulus shape with a shared vertical gradient for volume. A wide viewport slices the viewBox differently from a narrow one, so two cloud banks are swapped by media query rather than leaving the composition to the crop.

## Browser support

Current Chrome, Firefox, Safari, and Edge. Uses `<dialog>` (with a `window.confirm` fallback), `text-wrap: balance`, and `crypto.randomUUID` (with a fallback). Respects `prefers-reduced-motion`.

Verified in Chromium with a 32-check browser suite covering every feature above plus reload persistence, corrupt-storage recovery, markup-as-text handling, and no horizontal overflow at 320px.
