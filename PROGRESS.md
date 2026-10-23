# ALMOST PRESS · progress log

Autonomous overnight run. The brief lives in `references/almost-press-prompt.md`.

## Current phase
Phase 0 — done. Next: Phase 1 (design system + hidden `#/system` page).

## Done
- Phase 0: references moved (`references/dream-object-index.html`, `references/almost-press-prompt.md`,
  `references/moodboard/` kept). Vite 8 + TypeScript 7 scaffold, git (`main`), GitHub Pages workflow
  (`.github/workflows/pages.yml`, not pushed), fonts, `npm run build` passes, `npm run dev` starts
  (probed for a few seconds with curl, then stopped).

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

## Check in the morning
- `npm install && npm run dev` → open the printed URL.
