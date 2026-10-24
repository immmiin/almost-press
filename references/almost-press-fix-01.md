# ALMOST PRESS · revision 01
Read references/almost-press-prompt.md first; everything there still applies unless this file changes it.
I reviewed the live site (almost-press.vercel.app) screen by screen. The art and the tools are right.
Late Issue 01 pages (14–16) are exactly the look I want. What is wrong is clarity, scale, and a few decisions.
Work through the sections in order, commit after each section, and at the end build and deploy
(push to GitHub if the repo is connected so Vercel redeploys; otherwise run `npx vercel --prod`; free Hobby plan only, never anything paid).
Do not ask me questions; decide, and list every decision at the end.

## 1. Remove the zine title and most Korean
- Remove "A Day I Almost Remember", "거의 기억나는 하루" and "ほとんど覚えている一日" everywhere: Gate, Reader header, Issue 01 cover, colophon, slugs, PDF metadata. An issue is named only "ALMOST PRESS · Issue #0001" (+ the 殆 seal).
- The only Korean text on the site is the brand name "거의 인쇄소". Remove every other Korean UI string and Korean sub-label (e.g. "오늘 밤의 꿈을 시작", "꿈의 인쇄소 · 열여섯 쪽", "제1호 펼치기", Korean page numbers in slugs). The language switch becomes EN / 日. The dream input still understands Korean, English and Japanese, and Korean words a visitor types may still print on pages.
- Issue 01 cover page: rebuild it around ALMOST PRESS / 거의 인쇄소 / ほぼ印刷所, the issue number and the seal, keeping the bokashi band and the small clock.

## 2. Gate: the sheet IS the screen
- The rice-paper sheet fills the whole viewport edge to edge (deckled edges just inside the screen edge, washi tape on the corners). No floating card on a background.
- The mist shows through the paper (translucent sheet, fibres visible), the seal 殆 presses in the middle, ALMOST PRESS / 거의 인쇄소 / ほぼ印刷所 print plate by plate across the full sheet at poster scale (huge Hangul block, wide English, tall vertical Japanese; nothing clipped; the vertical ほぼ印刷所 is currently cut off by the sheet edge).
- The three slips sit ON the sheet, taped, at different angles: "Start tonight's dream", "Unroll Issue 01", "About the press" (Japanese sub-label only).
- Remove the "a dream print shop · 16 pages…" Korean lines; keep one tiny English + Japanese line.
- The cursor paints watercolor into the sheet (the paper absorbs it, then it fades). Clicking a slip peels it off and the sheet is pulled into the press.

## 3. Press: make the page the hero
- The page must be much larger: page height = available height minus 24px; drawer, tools and inks get narrower (drawer 200px, inks 220px, tools 64px) and each can collapse to a thin tab.
- Minimum UI text size 11px; labels must be readable. Fewer labels: show the 3-language name of a tool only on hover/focus.
- Stamps land larger by default (about 28% of page width) and keep their size relative to the page.
- Soft-focus panels: only after 60s idle, much milder (max 1.5px blur), never on the panel the cursor is in or the drawer while searching.
- The drawer's "wrong twin": rarer (1 in 40 renders), and visibly marked with a tiny red 双 stamp so it reads as intentional.
- The dream input starts empty with a placeholder ("a swan in the kitchen…"), not a pre-filled value.
- The 16-sheet strip: number sheets 1–16 in Arabic numerals with small kanji under them; current sheet clearly highlighted; empty future sheets look like blank paper waiting.
- Tool brushes: show a brush circle cursor sized to the stroke; make every tool clearly visible after one stroke on page 1 (currently too subtle); the knob "drift" also scales tool strength.

## 4. Make "print → next page" understandable (most important)
Right now visitors cannot tell what happens when they print: objects sometimes come back, sometimes vanish, sometimes return huge.
- PRINT: hold to print. While holding show each plate landing (already there) plus a text under the button counting "plate 1 · 2 · 3". On release before the end, show a slip "printed 2 of 3 plates" so the partial print is clearly intentional.
- After the sheet is pulled into the drum, play a 2.5s "the press remembers" sequence on the new sheet:
  · a faint mirrored ghost of the previous page appears (set-off),
  · inherited objects fly from the previous sheet's thumbnail in the strip to their new place,
  · each one gets a tiny printed tag for 2s: "remembered", "remembered wrong ×3.2", "remembered upside down", "keepsake · larger",
  · forgotten objects drift into the Forgotten dish with a tag "forgotten",
  · drift cards are stamped as small slips beside the page ("WAVE 0.4", "SCALE-WRONG", "LANGUAGE DRIFT") and stay listed in the sheet's slug.
- Add a "Memory" switch in the inks/controls panel: Off (every sheet starts blank) / Gentle / Normal / Wild. Default Normal.
- First-time guide: a single taped job-ticket slip on the first sheet with three lines: "1 Stamp things from the drawer · 2 Rub them with a seal tool · 3 Hold PRINT". Each line gets a red check stamp when done; the slip peels off after the first print. Never show it again (localStorage).

## 5. Finish without printing all 16
- Add "Fall asleep" (眠る) next to PRINT. It asks once on a slip ("the press will dream the remaining sheets"), then the press prints all remaining sheets by itself in a fast ceremony (about 0.8s per sheet), using inheritance and drift, then binds the issue. The visitor can reopen any sheet afterwards.
- Add "Print this sheet" as a single poster: A5 PDF with bleed + PNG, available any time from the strip (right-click or a small 刷 button on each printed sheet).
- Export of a finished issue stays as is (the AP-16 scene). From the Press, after binding, show a clear "Run the edition" slip.

## 6. Issue 01: early pages need the same beauty as the late ones
- Pages 1–8 are too empty and small. Re-art-direct them: larger objects, extreme scale contrast, stronger bokashi bands, one tool effect already visible per page from page 3 on, vertical Japanese lines as composition axes. They should still be crisper than pages 9–16, but each must work as a poster.
- Keep pages 14–16 as they are.

## 7. New features
- Quick dream: on the Gate and in the Press, "Dream it for me": type one sentence and the press prints all 16 sheets automatically (same ceremony as Fall asleep), then the visitor edits any sheet.
- Share link: "Share this issue" creates a URL that opens the finished issue in the Reader for anyone. Encode the issue data (seed, objects, strokes, inks per sheet) with the native CompressionStream (deflate) + base64url into the hash. No server. If the data is too large for a URL, fall back to downloading a small .almost file that the Reader can open by drag and drop.
- Reel recorder: in the Reader, "Record a reel" captures a 1080×1920 vertical video (MediaRecorder on a canvas) of the 16 sheets passing one by one with the mist behind them, 15–20s, and downloads it as .webm (and .mp4 if the browser supports it). Free, browser only.
- Optional sound (off by default): paper rustle when stamping, drum hum while printing, seal thud. Generate with Web Audio; no audio files from paid sources.

## 8. Check before deploying
- Take screenshots of Gate, Press (empty, after stamping, mid "press remembers"), Reader, Export at 1440×900 and 390×844, look at them, and fix anything clipped, too small, or generic.
- npm run build passes. Deploy. Give me the production URL and a short list of what changed.
