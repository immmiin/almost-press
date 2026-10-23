# ALMOST PRESS · 거의 인쇄소 · ほぼ印刷所 · 殆
A brand-new project in this empty folder (almost-press). It is NOT a rebuild of an
existing repo: do not look for, copy from, or modify any other project on this computer.

This is my SVA graphic design class project and a portfolio piece.

ALMOST PRESS is a dream print shop that floats in pastel ink-wash mist. Visitors print a
dream into a 16-page A5 risograph zine, "A Day I Almost Remember". Every page starts from
crisp, ordinary code-drawn objects; editing makes them bleed, blur, pour, break, repeat and
melt until the zine ends as a soft abstract dream painting. The world is a dreamy East Asian
painting (bright, pale, luminous; never dark or gloomy) crossed with risograph print and
gentle digital glitch.

The website itself must be as much the artwork as the zine: creative, lush, full of
interaction, slightly wrong everywhere, and still easy to use. Making a page, printing it,
moving to the next, finishing 16, binding and exporting a print-ready PDF must always be smooth.
If any screen looks like a generic AI-made website, a SaaS dashboard, or a cute children's
book, it has failed.

---------------------------------------------------------------------------------------------
## 0. Hard constraints
- No paid APIs, no image-generation models, no Draw Things. Every image is drawn and processed in code.
- No server. Static Vite + TypeScript site. Prepare it for GitHub Pages (GitHub Actions workflow + correct Vite base path) but do not create a repo or push; I will do that.
- Initialise git and commit at the end of every phase.
- UI default language English; switchable to Korean and Japanese. Dream input understands all three.
- Work in the phases in section 17. Stop at the end of every phase, report what you built and exactly how to check it, and wait for my approval.
- Allowed libraries: matter-js, opentype.js, jspdf, jszip. For shaders write raw WebGL2; you may use @paper-design/shaders (vanilla ShaderMount / raw shader strings) for mesh gradient, grain gradient, paper texture, dithering or halftone only if its license allows this use (check and tell me). For the cursor fluid you may adapt Pavel Dobryakov's MIT-licensed "WebGL Fluid Simulation" with attribution in the Colophon. Ask before adding anything else.
- Respect prefers-reduced-motion: replace motion with instant state changes; never remove function.
- Max 2 live WebGL contexts at a time (atmosphere + page); share them across screens.

---------------------------------------------------------------------------------------------
## 1. Source of truth
- dream-object-index.html (move it to references/ in Phase 0): 100 code-drawn objects (SVG primitives grouped into ink parts: solid, halftone tint, knockout), the riso engine (separate plates, multiply blending, per-plate misregistration, halftone patterns, knockout mask, grain filter, the "Ink-wash edges + rice paper" mode), an English/Korean dream parser, and 6 typographic treatments for words without objects.
  · Port every object drawing exactly (src/objects/<category>.ts). Do not redraw them.
  · The ink-wash mode is the default look: same shapes, edges slightly displaced and softened like ink soaking into absorbent paper, plates at ~0.86 opacity, coarse grain and visible halftone (the pixel-like texture must stay), rice paper with faint fibres.
- references/moodboard/ (if present): my reference images. Look at every image before designing anything, and describe back to me in one paragraph what you take from them. If missing, use section 3.
- Add Japanese names and aliases to all 100 objects (swan → 白鳥/はくちょう, clock → 時計/とけい, stairs → 階段, teacup → 湯呑み, kitchen → 台所, cloud → 雲, moon → 月 …). Extend the parser to Japanese: alias substring matching, longest alias first, strip particles は/が/を/に/で/の/へ/と/も.
- Generalise the engine from 3 to 1–4 plates. The 4th plate is used by type, washes, backgrounds and the seal.

---------------------------------------------------------------------------------------------
## 2. One-line idea
Crisp things become a dream. Page 1 is a clean riso print of ordinary objects on rice paper at
dawn. By page 16, under moonlight, the same things have bled, blurred, poured and broken into a
luminous abstract painting, with only a vermilion seal and a few tiny, perfectly sharp words left.

---------------------------------------------------------------------------------------------
## 3. Mood and references (my moodboard, in words)
1. ABPPW risograph poster: a blue riso photo torn into wavy horizontal displacement, type glitching with it, small fluorescent-pink type around the edges.
2. Soft-focus object prints on paper: objects photographed out of focus so they read only as shapes, with tiny crisp labels placed precisely around them ("Sweep the floor", "Mop the floor").
3. Blurred portrait on frosted vellum with small monospaced credits: haze over everything, only the type is sharp.
4. Marisa Purcell's wet paintings: pigment pooling and blooming, dotted patterns floating over washes, small red dots.
5. Pastel crayon and watercolor haze on torn paper slips with handwritten notes.
6. 24 solar terms riso posters (寒露 / 霜降 / 立冬 / 小雪): halftone fruit and snowflakes in misty mint, peach, pale pink; big vertical CJK; tiny bilingual text; dates set vertically.
7. Pixel-sorted waterfall: an image pouring downward in vertical streaks.
8. CRT/VHS angel: a glowing white silhouette with scanlines and chromatic fringing.
9. Airbrushed pastel dreamcore collage: lilac and mint haze, lace-like dot meshes, sparkle stars, glowing ribbons.
10. Pixel-sorted flowers: a garden dissolving into colored vertical lines.
11. EUPHORIA poster: noise-dissolved image with large thin type and tiny body text.
12. Grainy posterised pop art in lilac, periwinkle and mint.
Art and craft references to dig into and borrow from:
- Ink-wash painting (수묵/水墨): 발묵 splashed ink blooming along paper fibres, 선염 graded washes, 운무 mist separating near and far, huge 여백 empty space, small inscriptions (화제) and a red seal (낙관).
- Ukiyo-e bokashi gradation: ichimonji bokashi (a straight band of gradient across sky or water), futa-iro bokashi (two colors bleeding into each other), ate-nashi bokashi (soft undefined blush). Use bokashi as a core graphic device in the UI and the pages.
- Hiroshi Senju's waterfalls: fluorescent pigment on mulberry paper; water pouring from beyond the top edge into mist. A model for how pixel-sort "pour" should feel: luminous, not dirty.
- Emakimono (絵巻) hand scrolls: images unrolled horizontally, time flowing right to left.
- Risograph: overprint, misregistration, grain, halftone, ink starvation.
- Current web: living mesh/grain gradients, cursor fluid simulations (watercolor reveal as in Immersive Garden's David Whyte experience), dithering and halftone shaders, translucent material UI (reinterpret "liquid glass" as vellum and washi, never as generic glassmorphism), physics, View Transitions, scroll-driven type.

---------------------------------------------------------------------------------------------
## 4. Color: a dreamy, luminous East Asian painting
Bright, pale and airy. Many soft hues harmonising, never one flat theme color. Darkness only ever as a thin sumi line or tiny text.
UI and atmosphere tokens:
- Pearl paper 진주 #F6F2EC · Rice paper 한지 #F1ECE2
- Peach blossom 도화 #F7C6D4 · Light mauve #E6B5C9
- Wisteria 등꽃 #C9B6E4 · Lilac dusk #A88BC9
- Pale celadon 청자 #CFE6D2 · Mugwort 쑥 #B7CFA6
- Mist blue 안개 #C4D8EC · Moonwater #A9C6E8
- Sumi 먹 (text, lines) #3B3A40 · Soft ink (secondary text) #77737C
- Seal vermilion 주 #E5483E
- Fluorescent accents, used sparingly and only one per screen: #FF48B0 pink, #44D62C green, #62A8E5 cornflower
Riso ink library for the page (multiply on screen; mark metallic as approximate):
Fluorescent Pink #FF48B0, Light Mauve #E6B5C9, Orchid #BB76CF, Violet #9D7AD2, Purple #765BA7, Burgundy #914E72,
Bright Red #F15060, Scarlet #F65058, Fluorescent Orange #FF7477, Orange #FF6C2F, Sunflower #FFB511, Yellow #FFE800,
Light Lime #E3ED55, Fluorescent Green #44D62C, Green #00A95C, Seafoam #62C2B1, Mint #82D8D5, Teal #00838A, Smoky Teal #5F8289,
Aqua #5EC8E5, Sky Blue #4982CF, Cornflower #62A8E5, Blue #0078BF, Medium Blue #3255A4, Federal Blue #3D5588,
Brown #925F52, Metallic Gold #AC936E, Light Gray #88898A, Black #000000 (thin, reads as sumi)
Presets: Dawn (Fluorescent Pink, Orchid, Mint) · Celadon (Seafoam, Light Lime, Sky Blue) · Wisteria (Violet, Light Mauve, Mint) · Moonwater (Cornflower, Orchid, Light Lime) · Peach Mist (Fluorescent Orange, Light Mauve, Seafoam) · Sumi (Black, Light Gray, Scarlet).
Dream time: the atmosphere moves through the night as the issue progresses, staying light the whole time:
pages 1–4 dawn (peach, pearl) → 5–8 day (celadon, mist blue) → 9–12 dusk (wisteria, mauve) → 13–16 moonlight (moonwater, lilac, with fluorescent glow). Moonlight is pale blue-lilac, never black.

---------------------------------------------------------------------------------------------
## 5. Branding
- Name: ALMOST PRESS / 거의 인쇄소 / ほぼ印刷所. Each script set differently and never in a neat stack: English wide and flat, Hangul as a heavy block, Japanese set vertically (writing-mode: vertical-rl).
- Seal (낙관): vermilion square seal with 殆 ("almost": Korean hanja 거의 태, Japanese 殆ど). It is the logo, is stamped on every page, and a second small seal carries the issue number. Draw it in code with an uneven stamped edge, ink gaps and slight double-strike.
- Paper: rice paper (한지/和紙) drawn in code, warm white, visible fibres, deckled uneven edges on every sheet, slight translucency where sheets overlap.
- Materials of the UI: vellum (translucent tracing paper with fibres and grain, blurring the mist behind it), washi tape holding panels in place (pastel, dotted or striped, slightly crooked), seal stamps, glass ink vials, torn paper slips. These replace cards, buttons and modals.
- Type (Google Fonts, OFL):
  Display: Shippori Mincho B1 (JA/EN), Gowun Batang (KO), Bodoni Moda Italic (EN accents)
  Heavy accents: Dela Gothic One (JA), Black Han Sans (KO), Rubik Mono One (stretched EN labels)
  Text and data: IBM Plex Mono (tiny labels), IBM Plex Sans KR (body), DotGothic16 (pixel accent, rare)
  Type objects on pages: Bagel Fat One, Do Hyeon and the above.
  Tiny sharp text over soft images is a signature: 9–11px mono labels placed with precision.
  Vertical Japanese and dates run down edges as a structural axis.
- Iconography: single CJK characters in seal boxes, never generic icon sets or emoji.
- Copy: short, flat, print-shop and painting vocabulary (plate, drum, run, master, set-off, bleed, wash, seal, slug, jam, mist). Never explain the dream.
- Banned: Inter, Space Grotesk, Fraunces, Playfair; cream + terracotta; purple-to-blue gradient heroes; rounded cards; generic glassmorphism without paper texture; centered hero with a CTA button; emoji; stock icons.

---------------------------------------------------------------------------------------------
## 6. The atmosphere layer (behind every screen)
A full-screen WebGL layer: a living bokashi mist made of a slow mesh/grain gradient in the current dream-time colors and the current page's inks, paper grain on top, and a cursor fluid simulation: moving the cursor drags watercolor through the mist; it blooms and fades over a few seconds. Clicking drops a small ink bloom. It never competes with content (low contrast), pauses when the tab is hidden, and becomes a static gradient under reduced motion.

---------------------------------------------------------------------------------------------
## 7. Screens
### 7.1 Gate (entry)
- A huge sheet of rice paper floats in the mist, slightly tilting toward the cursor (parallax, max 4°).
- The seal 殆 is stamped onto it with a press (scale down, ink spread, a soft thud if sound is on).
- The title prints plate by plate in three scripts, misregistered differently on every visit.
- Three torn paper slips held with washi tape: "Start tonight's dream", "Unroll Issue 01", "About the press". Hovering makes a slip flutter (simple verlet paper or a cloth-like shader); clicking peels it off and the screen transitions.
- Transition into the Press: the sheet is pulled into the drum while a watercolor dissolve reveals the workbench (View Transitions + a dissolve shader).

### 7.2 Press (workbench)
Full screen, no page scroll on desktop, no wide empty side margins. The page is the hero.
- Center: the current A5 page as large as the viewport allows, deckled edges, paper shadow, crop marks and registration crosshairs around it. A vertical Japanese line beside it shows the page and dream time (第三頁 · 夜明け).
- Left: the object drawer on a vellum sheet taped to the mist. Search (EN/KO/JA), 8 categories as vertical labels, objects as rubber stamps. All objects are slightly out of focus; the one under the cursor comes into sharp focus (soft-focus reference). Categories switch with a smooth blur cross-fade.
- Above or right of the page: the transformation tools (section 9) as a column of seal stamps with one kanji each. Active tool: the seal turns vermilion and prints a faint mark on the vellum.
- Right: ink vials on a vellum sheet. Each ink is a glass vial of liquid pigment that sloshes when touched and drains as it is used. Drag a vial onto plate slot 1–4 (or click a slot). Presets as small swatch slips. Plate view toggle (each plate as grayscale, like Spectrolite). Knobs: misregistration, ink density, grain, drift. Side-effect switch: mild / normal / wild.
- Top: job ticket on a torn slip: seal logo, issue number, dream sentence input, language switch (EN / 한 / 日), sound toggle.
- Bottom: the 16-page strip as tiny sheets pegged on a thread (not a clothesline look; think a scroll rod with sheets), the Forgotten tray (a small ceramic dish), and the PRINT button: a large round enamel button with a vermilion ring that fills while held.
- Under 900px: the page fills the width; drawer, tools, inks become bottom sheets of vellum with tabs; touch works (pinch scale, two-finger rotate, one-finger brush).

### 7.3 Reader: the hand scroll
A finished issue opens as an emakimono: all 16 pages laid side by side on one long scroll, unrolled by horizontal drag or wheel, with inertia and paper curl at the unrolling edge. Time flows right to left. Toggle to booklet mode with 3D page turns and watercolor dissolves between spreads. "Run the edition" opens Export.

### 7.4 Export: the press runs the edition (section 13)

### 7.5 Colophon
About the project, inks, fonts, seeds, the moodboard, credits and licenses, in three languages, laid out like the inscriptions on a painting: small blocks of vertical and horizontal text around a large seal and lots of empty space.

---------------------------------------------------------------------------------------------
## 8. Making a page
- Stamping: picking an object puts it under the cursor as a ghost stamp. Press to stamp. Press duration = ink pressure (short = light, normal = full, long = ink blooms outward). Every stamp lands slightly differently.
- Dream sentence: Enter stamps matched objects and turns unmatched words into type objects (6 treatments, converted to outlines with opentype.js so they behave like objects). Optional; stamping by hand is the main way.
- Direct manipulation (selected object shows handles drawn like registration marks): drag to move · corner handle scales (shift = uniform) · top handle rotates. Keys: [ ] scale, R rotate 15°, F flip, D duplicate, Delete erase, hold C crumple, 1–4 move to plate, ↑/↓ layer order, arrows nudge. Shift-click multi-select. No undo; only "Reprint this page" (reset to how it came out of the drum).
- Every edit has a side effect, scaled by the switch and the page number: move → afterimage trail · erase → object-shaped hole showing paper or sky · scale up → a small copy stays behind · crumple → paper folds and unfolding reveals another pattern in the creases · plate change → ink bleeds onto the floor · flip → the shadow does not flip · duplicate → the copy is slightly wrong.
- Shake to forget: grab the page edge and shake; objects fall with matter-js into the Forgotten dish; they may return later, mutated.
- Grounds: rice paper, bokashi sky (ichimonji band), mist horizon, pool tiles, sea, cloud floor, checker floor, full-bleed wash, or "let the machine choose".
- Layout helpers: vertical Japanese line, Hangul block word, stretched English label, tiny inscription block, date column, seal. Each placed and edited like an object.

---------------------------------------------------------------------------------------------
## 9. Transformation tools (the heart of the project)
Seal-stamp tools, each a brush or lens used directly on the page. Strength from brush size, time and repetition.
滲 Bleed (발묵): ink blooms outward along paper-fibre directions with darker drying edges.
暈 Bokashi (선염): drag a soft gradient band of one ink (ichimonji) or two inks into each other (futa-iro).
霞 Haze: a lens; everything under it goes soft-focus; repeated passes leave ghost doubles.
波 Wave: tears the image into horizontal wave displacement (ABPPW poster); type caught in it glitches.
瀑 Pour: pixel sort; draw a line and everything below pours down in luminous streaks (Senju waterfall, not dirty glitch).
碎 Break: datamosh; moving an object drags macroblock tears and color smears behind it.
映 Tube: CRT/VHS: scanlines, chromatic fringing, soft glow halo (the angel reference).
反 Echo: Droste recursion of an area into itself, or ripple copies outward.
融 Melt: brush across two objects and they melt into each other.
點 Dither: coarse halftone and posterisation into big grainy color fields (pixel-art feeling).
Rendering rules:
- Objects stay editable vector layers. Tool strokes are stored as data (path, tool, size, intensity, seed), never as baked pixels.
- Effects run PER PLATE in a WebGL2 pipeline: each plate renders as a grayscale coverage field, the effect stack runs on each field, then plates are tinted and multiplied. Plate separations stay correct after any effect.
- All parameters in normalised page coordinates, so screen and 300dpi renders match.
- Interactive at screen resolution with cached unchanged plates; full re-render on pointer release.

---------------------------------------------------------------------------------------------
## 10. Print and next page (the core loop)
- PRINT is hold-to-print. While held: ink rollers sweep across the page, each plate lands with its own offset and a soft flash of its ink across the mist, the vial levels drop, the ring fills. Releasing early commits only the plates printed so far; that imperfect page stays in the zine.
- The sheet curls and is pulled into the drum; a watercolor dissolve brings out the next sheet, which already carries, misremembered by the machine:
  · 2–3 objects inherited from the previous page (Exquisite Corpse; the rest are forgotten)
  · a faint mirrored set-off ghost of the previous page
  · the keepsake (first object stamped on page 1), a little bigger every page
  · drift (section 11)
- The atmosphere shifts one step toward night.
- Clicking a printed sheet in the strip reopens it; later pages are not regenerated.
- After page 16: the 16 sheets fan out, are jogged, folded, saddle-stitched (two staples), the seal is stamped on the cover, and the issue unrolls as a hand scroll.

---------------------------------------------------------------------------------------------
## 11. Drift: random, different every issue
- Each issue has a seed shown as the issue number (#0000–9999) and carved into the small seal. All randomness derives from it; an issue is exactly reproducible.
- No fixed per-page schedule. Each new page draws random drift cards; only their number (1 → 5) and intensity (0.1 → 1.0) rise with the page number. The Drift knob scales this. Tendency: crisp → bled → blurred → poured/broken → abstract.
- Cards: the 10 tools applied automatically, plus scale-wrong, multiply (repeat in a row), gravity (ceiling, tilted or vertical horizon), material-swap (moon becomes a fried egg, sun a lemon slice), window-in-window, floor-swap, word-takeover, language-drift, mirror (unflipped shadows), ghost (earlier pages bleed through), crop-wrong, color-leak, ink-starve, misregister-spike, mist (fog layer between near and far), shrink-world, pile-in (everything inside one object).
- Layout templates vary per page (8+): vast emptiness with one small object, full-bleed wash, vertical Japanese axis, giant soft type, tall scroll-like composition, crowded tableau, horizon split, cropped close-up, solar-term poster layout (big vertical CJK + halftone object + tiny text).

---------------------------------------------------------------------------------------------
## 12. Weird, but never in the way
- Soft-focus interface: panels you have not touched for a while drift slightly out of focus; hovering brings them back sharp.
- UI labels drift between EN/KO/JA as the issue progresses (a lock switch keeps one language).
- The drawer sometimes shows an object twice; the twin is slightly wrong and stamps the wrong version.
- Page numbers occasionally misprint in the slug (p.7½), never in the real order.
- The seal sometimes double-strikes or lands rotated.
- After the tab was hidden, objects on the current page have slid slightly (never while visible).
- The cursor is a registration crosshair with a brush-tip halo; over the paper it leaves a faint ink trail that prints with the page.
- Idle 40s: the press dozes; the mist slows and a vial bubbles; any input wakes it.
- Three languages mix on the pages: the dream sentence is printed on every page and language-drift swaps object words ("a swan in the kitchen" → "a 白鳥 in the kitchen" → "백조 in the 台所"). Roles: Japanese vertical lines, Hangul heavy blocks or serif inscriptions, English stretched labels or tiny mono data.
- Slug line on every page: page number in three languages, inks, misregistration, drift cards, dream time, seed.

---------------------------------------------------------------------------------------------
## 13. Export: the press runs the edition
Full-screen scene: a code-drawn riso machine (front view, fictional model "ALMOST PRESS AP-16", no real brand names), styled like a pale celadon enamel appliance with a pearl drum window, sitting in the mist.
1. The machine glides in. Small LCD menu: Zine PDF / Spreads PDF / Plates (masters) / Instagram images / All.
2. Hold the round START button. The drum spins; LCD counts 01/16 … 16/16 from real render progress.
3. Sheets slide out onto the tray one by one; through the window each plate prints in order. The real 300dpi rendering runs during this.
4. If Plates is chosen, thin master sheets drift into the master box.
5. Paper jam: with a small seeded chance "PAPER JAM" flashes and one sheet comes out crumpled; choose Keep the jam or Reprint.
6. The stack is jogged, folded, stapled, sealed; the zine drops toward the viewer and files download.
Files:
- Zine PDF: A5 (148×210mm), 16 pages, 3mm bleed, with and without crop marks; each page rendered at 300dpi including bleed (1819×2551px) through the same WebGL pipeline, embedded with jspdf.
- Spreads PDF (cover, 2–3 … 14–15, back). Plates zip: one grayscale 300dpi PNG per ink per page after effects + ink list. Instagram: 1080×1350 PNG per page.
- Verify by reading the generated PDF: page count, page size, embedded image pixel sizes. Report the numbers.

---------------------------------------------------------------------------------------------
## 14. Motion language
- Every motion has a material reason: paper curls, ink spreads, mist drifts, seals thud, vials slosh. No generic fades, slides or bouncy easing.
- One orchestrated moment per screen: seal stamp (Gate), hold-to-print (Press), unroll (Reader), print run (Export). Everything else is quiet.
- Durations: micro 120–200ms, material 400–900ms, ceremonies 1.5–4s and skippable.

---------------------------------------------------------------------------------------------
## 15. Issue 01 (my assignment submission, fixed data, art-directed)
Store as src/issues/issue-01.json using the editor's own data model (objects, strokes, inks, seeds), not random.
Dream: "I was late for a swim, but the pool was in my grandmother's kitchen and the clock kept getting bigger."
Keepsake: clock. Arc: crisp → bled → blurred → poured/broken → abstract. Dream time from dawn to moonlight. Always light and luminous.
 1. Cover. Vast rice paper, bokashi peach band at the top, a small crisp clock, three-language title A Day I Almost Remember / 거의 기억나는 하루 / ほとんど覚えている一日, seal 殆. Dawn.
 2. Crisp kitchen: table, teacup, toast, small wall clock, lots of empty space, a tiny inscription. Peach Mist.
 3. A swan sits at the table. First vertical Japanese line. The clock is a bit bigger.
 4. The clock is as big as a house; ink blooms (滲) from its rim into the floor. Big Hangul "늦었다".
 5. The floor turns into pool tiles under a celadon bokashi; the swan floats; a ladder. Celadon.
 6. Mist: stairs rise into fog; twelve swans fade from crisp to washed out.
 7. Haze: the whole kitchen soft-focus; only tiny mono labels stay sharp around the shapes (table, cup, clock).
 8–9. Spread: the horizon stands vertical; everything ghosted double; giant vertical Japanese across both pages. Wisteria.
 10. Wave: the room tears into horizontal waves; the clock face ripples like water.
 11. Pour: the stairs pour down as a luminous pixel-sorted waterfall, fluorescent on pale lilac (Senju).
 12. Break: objects turn into their names (chair / 의자 / 椅子) and the names break into soft datamosh blocks.
 13. Tube: a glowing white swan silhouette with scanlines on a pale moonwater wash; the sentence mixed: "백조 in the 台所". Moonwater.
 14. Echo + ink starvation: the clock repeats into itself; streaks; misregistration; ghosts of earlier pages.
 15. Melt: everything dissolves into a wet abstract painting with floating dot patterns (Purcell); a faint clock circle remains.
 16. Back cover: luminous abstraction, one seal, colophon (seed, inks, drift cards, the dream) in tiny type.
Choose the remaining inks yourself. Every page must work as a standalone poster.

---------------------------------------------------------------------------------------------
## 16. Quality bar
- Smooth with 100 stamps in the drawer and 20+ objects plus effects on a page.
- Everything reachable by keyboard, visible focus, labels in the current UI language, sound off by default.
- Text contrast ≥ 4.5:1 for anything meant to be read (tiny labels in sumi on light paper).
- No placeholder content, no lorem ipsum, nothing from the banned list in section 5.
- Before finishing each screen, compare it against the moodboard and section 3 and fix anything that looks generic.

---------------------------------------------------------------------------------------------
## 17. Phases (stop and report after each)
Phase 0: Move dream-object-index.html and this prompt into references/ (keep references/moodboard/). Scaffold Vite + TypeScript, fonts, git, Pages workflow (no push). Look at the moodboard and write the one-paragraph summary. Confirm npm run dev and npm run build work.
Phase 1: Design system: color tokens, type, rice paper with deckled edges, vellum, washi tape, seal 殆, seal-stamp buttons, ink vials. Build a hidden /system page showing all of them.
Phase 2: Atmosphere layer (living bokashi mist + cursor fluid + dream time).
Phase 3: N-plate riso engine, 100 objects ported, Japanese names and parser, ink library, plate view.
Phase 4: Press layout, stamping, direct manipulation, edit side effects, type outlines, shake to forget, controls.
Phase 5: WebGL2 per-plate effect pipeline and all 10 tools, stored as strokes.
Phase 6: Print loop: hold-to-print, drum feed, inheritance, set-off, keepsake, seed, drift, layout templates, language drift, strip, binding.
Phase 7: Gate, Reader (hand scroll + booklet), weird details (section 12).
Phase 8: Export scene and all files; verify the PDF numbers.
Phase 9: Issue 01 built and polished page by page; Colophon; three-language UI.
Phase 10: Mobile (400px), keyboard, performance, final build.
At the end of each phase, list the screens and actions I should check on the dev server.
