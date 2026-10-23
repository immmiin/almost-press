# ALMOST PRESS · 거의 인쇄소 · ほぼ印刷所 — done

All phases from the brief (0–10) are built and committed on `main` (not pushed). `npm run build` passes.
The full log, with every decision I made for you, is in `PROGRESS.md`.

## What there is
- **Gate** `#/gate`: a floating rice-paper sheet, the 殆 seal pressed on, the title printed plate by plate (misregistered differently on every visit), three taped slips.
- **Press** `#/press`: the workbench. Drawer (100 stamps, EN/KO/JA search), 10 seal-stamp tools that run per plate in WebGL2, glass ink vials with 29 inks and presets, hold-to-print, 16 sheets on the scroll rod, Forgotten dish, binding after page 16.
- **Reader** `#/reader?issue=01`: hand scroll (right → left, drag or wheel) and booklet with page turns.
- **Export** `#/export?issue=01`: the AP-16 machine runs the edition: zine PDF (bleed and crop-mark versions), spreads PDF, plates zip, Instagram images, or all of them.
- **Colophon** `#/colophon`: three languages set like inscriptions around a seal.
- Hidden: `#/system` (design system), `#/specimen` (objects and tools).

## Export numbers (read back from the generated files)
- Zine, bleed: 16 pages · 154×216 mm (148×210 + 3 mm bleed) · 16 images, each 1819×2551 px (300 dpi)
- Zine, crop marks: 16 pages · 178×240 mm · 16 images, each 1819×2551 px
- Spreads: 9 pages · 302×216 mm · 9 images, each 3567×2551 px
- Plates: 50 ink masters + 16 stamp-and-type masters, each 1819×2551 px, plus `inks.txt`
- Instagram: 16 × 1080×1350 PNG

To re-check: `npm run build && node scripts/verify-export.mjs 01 all`. This runs headless Chrome on `dist/` (no server) and prints the numbers.

## Morning checklist
- [ ] `npm install && npm run dev`, then open the URL it prints.
- [ ] **Gate**: watch the seal press. Hover the slips and click one.
- [ ] **Press**: stamp a few objects (press longer for more ink). Try the tools 滲 暈 霞 波 瀑. Type a dream and press Enter. Hold PRINT (or hold Space) and print a few pages. Shake the paper to forget.
- [ ] **Reader** (`#/reader?issue=01`): drag the scroll, switch to booklet, then press "Run the edition".
- [ ] **Export**: hold START with "All" selected and open the downloaded zip. Then try `#/export?issue=01&jam=6` to see the paper jam (Keep the jam / Reprint).
- [ ] Open the zine PDF in Acrobat or Preview and check the bleed, the crop marks, and that the colour feels right for the riso.
- [ ] **Colophon**: replace "the student (SVA)" in `src/screens/colophon.ts` with your name.
- [ ] Narrow the window to 400 px: the Press panels become bottom sheets (判 / 道 / 墨).
- [ ] `references/moodboard/` was empty, so I designed from section 3 of the brief. If you add images, I can re-tune.
- [ ] When you are happy, create the GitHub repo and push. The Pages workflow is ready (`.github/workflows/pages.yml`).

## Known limits
- Page images in the PDFs are JPEG q0.93 (each zine PDF is about 28 MB). Plates are lossless PNG, so "All" is about 200 MB.
- Per-object soft focus uses canvas `filter`. Safari before 18 ignores it, so those objects just stay sharp.
- The cursor fluid is my own solver (not Pavel Dobryakov's code). It is credited as being after Stam and Dobryakov.
