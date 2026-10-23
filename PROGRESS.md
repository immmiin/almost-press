# ALMOST PRESS · progress log

Autonomous overnight run. The brief lives in `references/almost-press-prompt.md`.

## Current phase
Phase 9 — done. Next: Phase 10 (mobile 400 px, keyboard, performance, final build) → DONE.md.

## Done
- Phase 0: references moved (`references/dream-object-index.html`, `references/almost-press-prompt.md`,
  `references/moodboard/` kept). Vite 8 + TypeScript 7 scaffold, git (`main`), GitHub Pages workflow
  (`.github/workflows/pages.yml`, not pushed), fonts, `npm run build` passes, `npm run dev` starts
  (probed for a few seconds with curl, then stopped).

- Phase 1: `src/design/` tokens (UI colours, 29 riso inks, 6 presets, 4 dream times), rice paper
  (code-drawn fibres + formation, seamless tile; deckled / torn edges via `clip-path: path()` kept in sync
  with ResizeObserver), vellum (backdrop blur + fibre grain), washi tape (4 patterns, torn ends), torn slips,
  seal 殆 (rough edge, ink gaps, double strike, rotation; glyphs are real Shippori Mincho B1 outlines
  extracted at build time into `glyphs.ts`, so no 15 MB font load), issue-number seal, 10 seal-stamp tools,
  glass ink vials (spring slosh, drain, bubbles), ceramic knobs (role=slider, keyboard), mild/normal/wild
  switch, enamel PRINT button with filling vermilion ring. Hidden sheet at `#/system`.

- Phase 2: `src/atmosphere/atmosphere.ts` — WebGL2 context #1. Warped 4-point mesh gradient (bokashi),
  ichimonji band, drifting mist banks, faint current-page inks, paper grain, fluorescent glow at moonlight.
  Own small stable-fluids solver (advect / divergence / 16 Jacobi / gradient) at 128px velocity and
  512px dye; dye is stored as absorbance so the cursor paints watercolour that dries darker at the edges
  and fades over ~3 s; click = ink bloom. Dream time blends continuously from page 1 to 16. API:
  setPage, setInks, flashInk, bloom, setDissolve (watercolour wash used for screen transitions), sleep.
  Paused when the tab is hidden; reduced motion → one static frame, no fluid. Renders at 0.5× resolution.

- Phase 3: `scripts/port-objects.mjs` copies the 100 drawings verbatim from the reference into
  `src/objects/<category>.ts` (only change: one type annotation `(a:number)`). `src/objects/ja.ts`: Japanese
  name + aliases for all 100. Parser (`src/parse/parser.ts`): EN/KO as reference, JA alias substring
  matching, longest first, particles stripped. Riso engine: `riso/draw.ts` interprets the part markup on
  2D canvases (synchronous, resolution independent, text → opentype.js outlines when the TTF is loaded);
  `riso/plates.ts` rasterises 1–4 plate coverage fields (R solid, G tint, B wash) + an overlay for the seal
  and sharp type; `riso/pipeline.ts` (WebGL2 context #2) runs per-plate effects + halftone/grain screening,
  then multiplies tinted plates on rice paper; plate view (single plate grayscale or 2×2 Spectrolite grid).
  Hidden specimen at `#/specimen` (add `?tool=wave` etc. to see a tool).

- Phase 4: Press at `#/press` — ticket (seal, issue no., dream input, EN/한/日, language lock, sound),
  drawer (search EN/KO/JA, 8 vertical categories + grounds 地 + type & marks 字, soft-focus stamps, the
  wrong twin), stage (ghost stamp, press duration = pressure, long press blooms, handles drawn as
  registration marks, keys, side effects for move/erase/scale/crumple/plate/flip/duplicate, cursor ink
  trail that prints, shake the paper to forget → matter-js drops objects into the dish; dish items can be
  stamped back, mutated), tools column (10 seal stamps + layer 上/下 + Reprint this page), ink panel
  (vials per plate, add/remove plates 1–4, 29-ink library click or drag onto a slot, presets, plate view,
  knobs, mild/normal/wild), bench (16 sheets on a scroll rod, right→left; Forgotten dish; PRINT).
  Under 900 px the side panels become bottom sheets (finished in Phase 10).
- Phase 5: all 10 tools are stored strokes (path, tool, size, intensity, seed, plate) rasterised into
  three RGB mask fields + echo uniforms; each plate runs the stack in the WebGL2 pass. Specimen of all
  tools: `#/specimen?tools=1`.

- Phase 6: `src/print/loop.ts` (commit print with partial plates, nextPage: 2–3 inherited objects
  misremembered, forgotten objects may return mutated, keepsake grows 14 %/page, mirrored set-off ghost,
  inks drift toward the dream time, 4th plate appears later), `drift.ts` (27 cards, count 1→5,
  intensity 0.1→1.0, five-stage tendency), `layouts.ts` (9 templates), language drift in the printed
  dream line, slug with occasional misprint (p.7½), binding ceremony (`binding.ts`). Verified headless:
  16 prints → binding → reader.
- Phase 7: Gate `#/gate` (parallax ≤ 4°, seal press with thud + ink bloom, three-script title printed plate
  by plate with per-visit misregistration and an SVG riso grain, three taped slips that flutter and peel,
  drum pull + watercolour dissolve). Reader `#/reader?issue=01|current` (hand scroll right→left, drag/wheel
  inertia, curl at the left roller, booklet with 3D leaf turns). Weird details: soft-focus panels after
  28 s, doze after 40 s (mist slows, vials bubble), objects slide after the tab was hidden, label language
  drift (lock switch in the ticket), wrong twin in the drawer, slug misprints, seal double-strike/rotation,
  crosshair cursor with brush halo, cursor ink trail that prints.
- Phase 8: Export `#/export?issue=01|current` (Reader → "Run the edition"). Code-drawn AP-16 in celadon enamel
  glides in; LCD job menu (Zine PDF / Spreads PDF / Plates / Instagram / All, arrow keys), hold START (pointer or
  Space/Enter), drum spins, LCD counts real renders, each plate passes through the pearl window in its ink, sheets
  slide out onto the tray (left; time flows right→left), masters drift into the master box, seeded paper jam
  (Keep the jam → that sheet is rendered crumpled / Reprint), then jog · fold · two staples · seal · the zine drops
  toward the viewer, files download, and a sheet lists every file with numbers read back from the PDFs.
  Files: `src/export/files.ts` (render + PDF/zip builders), `src/export/inspect.ts` (PDF read-back).
  **Verified** with `node scripts/verify-export.mjs 01 all` (headless Chrome on `dist/`, downloads read back from disk):
  · zine-A5-bleed.pdf: 16 pages · 154×216 mm (148×210 + 3 mm bleed) · 16 images 1819×2551 px
  · zine-A5-cropmarks.pdf: 16 pages · 178×240 mm (bleed sheet + 12 mm slug with crop marks + registration targets) · 16 images 1819×2551 px
  · spreads.pdf: 9 pages · 302×216 mm (cover, 2–3 … 14–15, back) · 9 images 3567×2551 px
  · plates.zip: 50 plate masters 1819×2551 (one per ink per page) + 16 stamp & type masters + inks.txt
  · instagram.zip: 16 × 1080×1350 PNG
  Full "All" run of Issue 01: ~16 s in headless Chrome on this Mac.
- Phase 9: Issue 01 reviewed page by page against section 15 from the real 300 dpi renders (contact sheets via
  `node scripts/contact.mjs`). Changes: p.6 the twelve swans now recede in one stream from crisp/large to
  small/faint/soft into the fog; p.15 is a luminous pink wet wash (was a muddy brown floor) with four floating dot
  meshes (Purcell). New: per-object soft focus (`blur`, was in the model but not rendered) and the 玉 dot-mesh
  helper (also in the drawer's type & marks). Colophon `#/colophon`: three-language inscriptions around a pressed
  seal (about, inks, type, seeds, moodboard, credits + licences). Remaining English-only screen-reader labels and
  Reader strings moved into i18n (EN / 한 / 日).

## Moodboard
`references/moodboard/` is **empty**, so per the brief I worked from section 3. What I take from it:
the image itself is never the sharp thing. Pictures arrive soft, torn, poured or haloed (a riso photo
ripped into horizontal waves, objects shot out of focus, a portrait behind frosted vellum, a waterfall
and a garden pixel-sorted into vertical streaks, an angel glowing through scanlines), and against that
softness the only crisp marks are tiny, precisely placed labels, mono credits, vertical CJK and dates
running down an edge like a ruler. Colour is pale and many-voiced: misty mint, peach, lilac, periwinkle,
pearl, with one fluorescent pink or a small red dot used like a seal. Pigment pools and blooms
(Purcell), halftone dots float over washes, crayon haze sits on torn slips held by tape. So the rule for
every screen is: soft fields, sharp type, lots of air, one hot accent, and paper you can feel.

## Decisions made on your behalf
- **Moodboard folder empty** → design from section 3 (summary above). Drop images in later and I can re-tune.
- **Base path**: `vite.config.ts` uses `BASE_PATH` env (the Pages workflow sets `/<repo-name>/`
  automatically); local builds use `./`. Routing is hash based (`#/press`, `#/system` …) so Pages never 404s.
- **@paper-design/shaders**: licence checked — Apache-2.0 (LICENSE + NOTICE in the package), so it would
  be allowed. I did **not** use it: every ShaderMount creates its own WebGL context and the brief caps us
  at 2 live contexts, so all shaders (mist, grain, bokashi, halftone, dither) are raw WebGL2 written here.
- **Fonts**: UI fonts come from Google Fonts CSS (subsetted woff2). For type-as-object outlines
  (opentype.js cannot read woff2) the OFL TTFs are self-hosted in `public/fonts/` and loaded lazily only
  when a word needs them. Shippori Mincho B1's TTF is 15 MB, so it is *not* self-hosted: Japanese
  type objects use Dela Gothic One outlines; Shippori is used through Google Fonts for UI and canvas text.
- **Dev-only tool**: `playwright-core` (Apache-2.0, devDependency, no browser download) drives the
  installed Google Chrome headlessly to screenshot `dist/` with request interception — no server is run.
  `node scripts/shot.mjs "#/route" out.png` (outputs go to `.shots/`, git-ignored).
- `overnight.log` and `run-overnight.sh` stay in the root (the runner uses them); the log is git-ignored.

- **Knockout order**: the reference applied every knockout as one page-wide mask, which also erased parts
  drawn after it (the fried egg lost its yolk). Here a knockout cuts everything drawn *before* it (including
  objects beneath) and later parts print over it. Same drawings, intended look.
- **Seal and tiny type are not plates**: the seal is hand-stamped in vermilion after the run (as a real
  낙관 would be) and tiny inscriptions / slug / date columns print on a sharp overlay that the effects never
  soften (moodboard: soft image, sharp labels). Tiny text uses the darkest page ink if it reaches 4.5:1 on
  rice paper, else sumi. Both are exported as an extra "stamp & type" master in the Plates zip.
- **Hangul detection**: the reference's `/[ㄱ-힝]/` also matches kana and kanji; narrowed to Hangul so
  Japanese can be parsed separately.
- Halftone cell is 1.05 mm (in page mm, so screen and 300 dpi match); coarse on purpose (visible dots).

- **Layer order keys**: plain ↑/↓ already nudge (as the brief also asks), so layer order is Alt/⌘+↑/↓
  and the 上/下 buttons under the tools.
- **Shake to forget**: grab the paper where there is no object and shake left-right (4 quick reversals).
- **Hold Space** anywhere on the Press (outside inputs) also holds PRINT.

- **Export formats**: page images in the PDFs are JPEG q0.93 (each zine PDF ≈ 28 MB; lossless would be ~10×).
  Plates are PNG (lossless, as masters should be); "All" is one zip (~200 MB for Issue 01, mostly plate PNGs).
- **"All" = one zip** containing both zine PDFs, spreads, plates zip and Instagram zip (browsers block many
  separate downloads). Single jobs download their files directly.
- **Paper jam**: seeded per issue (30 % of issues jam, on one of sheets 2–15), so the same issue always jams the same
  sheet. Add `&jam=6` to the export URL to force a jam on sheet 6 when you want to see it.
- An unfinished issue (fewer than 16 printed sheets) shows "NEED 16 SHEETS" on the LCD and START stays disabled.

- **Colophon credits** name you as "the student (SVA)" — put your real name in `src/screens/colophon.ts` (I did not
  want to guess how you sign your work). The fluid credit says it is my own solver after Stam / Dobryakov (no code copied).

## Check in the morning
- `#/colophon` — replace "the student" with your name.
- `#/export?issue=01` → hold START (choose "All" or one job on the LCD). Try `#/export?issue=01&jam=6` for the jam.
- `npm install && npm run dev` → open the printed URL.
