# ALMOST PRESS — Revision Brief

You are revising an existing prototype: "ALMOST PRESS — A Day I Almost Remember", a riso-printed dream zine maker (live at https://almost-press.vercel.app). The core combination system (typing a dream → code-drawn objects/typographic objects → editing makes them stranger → 16-page issue) WORKS and must be kept. What's wrong is UX, layout polish, broken interactions, and the weirdness being too timid. Fix EVERYTHING below in one pass, then run the QA checklist at the end and fix anything that fails. Do not remove features unless told to.

NOTE: This brief was written from the live site only, not the code. Names like Seal, Pills/Inks, Potions, Forget, Print, Colophon, Press are guesses — map them to the real components first.

## 0. DESIGN NORTH STAR
- Feel: a bright, dreamy East-Asian ink painting printed on a risograph. Palette: fluorescent pink, lavender/purple, pale mint green, soft yellow, on warm off-white paper. Keep the halftone / pixel-dot texture and the riso misregistration. Never dark or horror.
- "Strange but beautiful": the weirdness must look INTENTIONAL and crafted, never broken or cheap. Every odd thing should have clean typography, deliberate spacing, and smooth easing. If something looks like a bug, it's wrong; if it looks like a dream, it's right.
- Layout: editorial, generous negative space, asymmetric but on a strict underlying grid (12-col, 8px baseline). Big confident type, tiny precise labels. Think art-book / gallery-catalog, not app dashboard.
- Typography: one expressive display face (serif or condensed grotesk) for titles + one mono for labels/UI. Labels in small caps mono, letter-spaced. Define a type scale and use only it.
- Motion: custom easing (e.g. cubic-bezier(.2,.8,.2,1)), 300–700ms. No linear "float up" slides. Things arrive like ink settling or paper feeding, not like a default fade-up. Respect prefers-reduced-motion.
- ENGLISH ONLY. Remove every Korean/Japanese UI string and the language toggle. (Only exception: the small brand mark "거의 인쇄소" may stay as a graphic stamp in the footer.)

## 1. HOME / COVER
- Remove the Korean subtitle under "A Day I Almost Remember".
- Cover fills the full viewport. Redesign so it's beautiful and surprising:
  - Huge title with slight two-color riso misregistration (pink + lavender plates offset 2–3px, drifting very slowly).
  - A few of the user's past dream objects (from saved issues; fallback to a curated default set) float in the negative space at different depths. Hover = bleeds a little ink; click = wobble + soft sound.
  - Cursor leaves a fading halftone-dot trail in pale ink.
  - Primary CTA "Start a Night" (large, clear). If an unfinished issue exists, secondary CTA "Continue Issue N — page X of 16".
- ISSUE SHELF instead of a fixed "Dream Issue 1": all issues as a row of zine spines/covers (Issue 1, 2, 3…). Issue number auto-increments for every new night. Published issues open in a reader; drafts reopen in the studio. New user sees only "Issue 1 — not yet printed" as a blank spine.
- Persist all issues in localStorage (pages, objects, transforms, inks, seal, publish state).

## 2. NAVIGATION, ABOUT, PRESS, COLOPHON, SOUND
- Nav (minimal, mono): Cover · Studio · Press (archive) · About. Remove "Colophon" from the nav.
- ABOUT (currently empty) — real content: what ALMOST PRESS is ("a print shop for dreams you almost remember"), how it works in 4 short illustrated steps (Type the dream → Arrange the objects → Print the page → Watch the next page forget), the idea that each edit and each page makes the dream stranger, and a short credits/colophon block at the bottom (typefaces, inks, "printed at 거의 인쇄소", year). The colophon lives here now.
- PRESS / ARCHIVE (currently empty) — the shelf of all printed issues: grid of covers, each opens a page-flip reader, with "Download PDF" per issue. Designed empty state (a blank drum waiting for paper), not blank.
- SOUND: keep the toggle but make it ACTUALLY work. Synthesize with Web Audio API (no files): soft key tick when typing, paper rustle when placing, glassy "plink" for pills, bubbly tone for potions, riso drum hum + paper feed when printing, detuned chord on the strange page transition. Default OFF; label shows real state ("Sound: Off" / "Sound: On"). Unlock audio on first user click.

## 3. STUDIO (PAGE EDITOR) — LAYOUT
Rebuild as a beautiful print-shop workbench, not floating panels:
- Center: the page (A5 portrait), large, subtle paper shadow and grain. Page counter "07 / 16" in mono nearby.
- Left rail: dream input + object tray (objects waiting to be placed).
- Right rail: Inks (pills) top, Potions (effects) below, Forget at bottom.
- Bottom bar: Undo · Redo · Print this page · Publish issue.
- Everything on the grid, equal gutters, no overlapping panels. Narrow screens: rails become bottom sheets.

## 4. DREAM INPUT (typing)
- Currently hard to see. Make it large (min 20px), high-contrast ink on paper, visible blinking caret, placeholder "Type what you remember…", visible focus state, hint "Enter to summon".
- Typed letters look riso-stamped (slight offset, dot texture) but stay perfectly legible.
- Enter turns words into tray objects (dictionary) or typographic objects (unknown words), as now.

## 5. SEAL
- The red seal/stamp appears ONLY on page 1 of each issue (like an artist's chop on the first sheet). Pages 2–16 never get a seal. Stamp-press animation the first time the user types on page 1.

## 6. SELECTION & TRANSFORM (critical bug)
Currently after placing an object it stays selected forever and nothing else can be clicked or resized. Rewrite the selection model:
- Click object → select (clean bounding box, corner handles + rotate handle).
- Click empty paper, Esc, or click outside the page → deselect.
- Click another object → switch selection.
- Drag body = move. Drag corner = scale (Shift = keep ratio). Rotate handle = rotate. Scroll/pinch on selected = scale.
- Arrow keys nudge 1px (Shift 10px). Delete/Backspace = forget selected. Cmd/Ctrl+Z / Shift+Cmd+Z = undo/redo. ] / [ = bring forward / send back.
- Use pointer events with proper pointer capture and release on pointerup/pointercancel so the canvas never gets stuck. Ensure no invisible overlay blocks clicks after placement.
- Double-click object = quick menu (Duplicate, Flip, Forget, Bring to front).
- Placing: drag from tray onto page OR click tray item then click page. New object is selected but deselects normally.

## 7. INKS (pills) — make them understandable and working
- Currently unclear and every pill gives the same color. Each pill must be a DISTINCT riso ink with name + swatch: Fluorescent Pink, Lavender, Mint, Sunflower, Medium Blue, Coral, Teal, Purple (+ a few 2-ink sets).
- RULE: inks NEVER recolor anything already placed on the page — the page is the user's finished design. Inks only dye objects waiting in the TRAY (so what gets placed next), and the color of newly typed words.
- Click a pill → tray objects visibly soak up the ink (halftone wipe, 500ms). Show "Loaded: Lavender" with the pill glowing. Tooltip: "Load this ink — colors the objects you haven't placed yet."
- One-time coach mark on first studio visit explaining pills vs potions.

## 8. POTIONS (effects) — currently feel broken / do nothing
- Potions apply dream-effects to the CURRENTLY SELECTED placed object only. If nothing is selected, the bottle shakes and a hint says "Select something to pour on".
- Each potion gives a clearly different visible result: Grow, Shrink, Crumple, Echo (afterimage trail), Hole (punched halftone holes), Melt, Glitch (pixel-shift bands), Repeat (tiles the object), Misregister (plates split), Bloom (ink bleeds outward). Effects stack; repeated use gets stranger.
- Pour animation: bottle tips, drop falls on the object, effect blooms. Every potion is undoable.
- Redesign the potion area: a neat shelf of small glass bottles with mono labels on the grid, not a messy cluster.

## 9. FORGET (delete) — currently doesn't work
- "Forget this": removes only the selected object (also Delete key / quick menu). Object dissolves into scattering halftone dots.
- "Forget the page": clears all objects on the current page; press-and-hold 1s (ring fills) to confirm. Undoable.
- Forgotten objects leave a faint ghost on the paper ~2s, then vanish.

## 10. PRINT & PAGE TRANSITION (make it stranger)
- PRINT must PRESERVE the current page exactly as designed. Freeze it (snapshot + data). A printed page is never altered afterward.
- Sequence: page slides into a riso drum, drum hum + paper feed sound, printed sheet drops into a "printed stack" strip (pages 01…16, click any to view read-only).
- THEN the move to the next page goes unexpectedly wrong — genuinely uncanny, more than now. Random, never the same twice in a row, intensity scales with page number:
  - The next blank page arrives already carrying a few previous objects that have migrated, mutated, or swapped colors (only on the NEW page; the printed one stays untouched).
  - Paper jam: the sheet crumples, unfolds, creases remain as texture.
  - Page arrives upside down or mirrored, slowly corrects itself — but one object doesn't.
  - Words from the previous dream reappear misspelled or half-erased as faint typographic objects.
  - Ink overflow: one ink floods the edge and recedes, leaving a stain.
  - Page counter glitches (07 → 09 → 08) before settling.
  - An object from page 1 secretly reappears tiny in a corner.
  - Halftone dots enlarge into a pattern, then resolve.
- Always fully interactive afterward; inherited objects are normal editable objects.

## 11. PUBLISH & PDF EXPORT
- "Publish issue" available any time after at least 1 printed page — 16 pages NOT required. If fewer than 16, auto-add a closing page ("the rest was forgotten") and a back cover.
- Publishing ceremony: pages fan, bind, the issue spine appears on the home shelf with its number.
- "Download PDF": full issue (render each page to a high-res canvas, ~300dpi), A5 pages: cover with title + issue number + date, all pages in order, closing page, colophon back page. Optional toggle "Print spreads" (2-up). Filename: almost-press-issue-03.pdf. Use jsPDF only if the project has no PDF solution yet.
- Also allow downloading a single printed page as PNG.

## 12. EXTRA INTERACTION IDEAS (implement as many as fit cleanly)
- Idle drift: no interaction for 20s → objects very slightly drift and fade, as if the dream is slipping; any movement restores them.
- Shake the page (fast drag on empty paper) → objects jiggle and rearrange slightly.
- Hover a printed page in the stack → tiny preview.
- Each issue gets an auto-generated poetic title from its typed words (e.g. "Issue 03: The Staircase That Was Also a Fish").
- Night timestamp on each page ("printed 02:57 AM").
- Subtle paper grain + halftone overlay moving very slowly so the whole site feels alive.

## 13. POLISH PASS
- Remove all rising "float up" entry animations; replace with ink-settle or paper-feed motions.
- Consistent spacing; one primary, one secondary, one ghost button style; consistent hover/active/focus/disabled states.
- No overlapping text, cut-off labels, orphan buttons, empty pages, or placeholder text.
- Every button does something; no dead controls.
- Correct cursors (move, resize, rotate, pointer).

## QA CHECKLIST (verify every item, fix failures before finishing)
- [ ] No Korean subtitle, no language toggle, English UI everywhere
- [ ] Starting a new night creates Issue N+1; shelf shows all issues
- [ ] About and Press pages have real designed content; Colophon is inside About
- [ ] Sound toggle actually plays sounds
- [ ] Input text clearly readable while typing
- [ ] Seal only on page 1
- [ ] Can place, deselect, select another, move, scale, rotate, delete — mouse and keyboard
- [ ] Each pill gives a different color, and only tray objects change color
- [ ] Each potion visibly changes only the selected object; undo works
- [ ] Forget one object and forget page both work; undo works
- [ ] Printed pages are frozen and viewable unchanged
- [ ] Page transition is noticeably strange and varies each time
- [ ] Can publish with fewer than 16 pages
- [ ] PDF downloads with cover, pages, closing page, colophon
- [ ] Data survives page reload
- [ ] Looks good at 1440px, 1024px, and 390px wide
