# ALMOST PRESS · progress log

Autonomous overnight run. The brief lives in `references/almost-press-prompt.md`.

## Current phase
Phase 3 — done (and the WebGL2 effect pipeline of Phase 5 is written). Next: Phase 4 (Press layout and editing).

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

## Check in the morning
- `npm install && npm run dev` → open the printed URL.
