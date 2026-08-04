---
name: photo-deck
description: Build a talk deck as one self-contained HTML page from a folder of the user's own photographs — geometry rules that keep photos from being cropped, a template plus build step that inlines images as data URIs, and a Playwright loop that screenshots and verifies every slide. Use when the user wants slides, a deck, or a presentation built around photos they supply, wants to turn a folder of images into a talk, or asks for a presentation published as an Artifact.
---

# Photo deck

A deck of the user's own photographs, delivered as a single HTML file that
opens offline. Method and traps only — **invent the visual identity fresh
every time.** Reusing a past deck's palette, display face, or signature
element produces the templated look `frontend-design` exists to prevent.
Derive the palette from these photographs and this subject.

## Pipeline

```
photos/ ──prep-images.sh──▶ web/ ──┐
                                    ├── build.py ──▶ deck.html ──▶ Artifact
        deck.template.html ─────────┘                     │
                                                    shots.js verifies
```

1. **Look at every photo first.** Read them. Note each one's orientation and
   where its subject sits — that decides the layout, and you cannot art-direct
   what you have not seen.
2. `scripts/prep-images.sh` — resize each photo to the size it is *displayed*
   at, not its original size. Oversized images are the main cause of a bloated
   deck.
3. Write `deck.template.html` with `__IMG_NAME__` placeholders where sources go.
4. `python3 scripts/build.py` — inlines every image as a data URI.
5. `node scripts/shots.js deck.html` — screenshots each slide and reports
   overflow, JS errors, and per-photo crop. **Read the screenshots.**
6. Iterate on the template, rebuild, re-verify. Publish the built file.

Deliver the local `deck.html` as the thing to present from — it needs no
network and no login. An Artifact URL and a PDF are backups, in that order.

| Script | Does |
|---|---|
| `prep-images.sh` | resize a photo folder (macOS `sips`; reads HEIC and WebP) |
| `build.py` | substitute `__IMG_*__` with data URIs, fail loudly on a miss |
| `shots.js` | screenshot every slide; report overflow, crop, JS errors |
| `deck-nav.js` | arrow-key navigation, in-slide builds, fullscreen — drop in inline |

`shots.js` needs `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install playwright`
in the deck directory; it drives the Chrome already installed. Mark anything
that deliberately runs under fixed footer chrome with `data-bleed`, or it is
reported as buried content.

## The one rule that matters most

**The photo's aspect ratio decides how the slide is split**, never the reverse.
Forcing every slide to the same proportion is what crops photographs.

```
photo_region_width = slide_height × photo_ratio
text_column        = grid_width − photo_region − gap − rail
```

Portrait photo → narrow region → wide text column. Landscape → the opposite.
Work it out per slide. See [GEOMETRY.md](GEOMETRY.md) for the treatments this
enables (three-side bleed, whole-frame, gallery) and the edge-fade and
white-catalogue-shot techniques.

## Non-negotiables

- **No webfonts.** The Artifact CSP blocks font CDNs and fails silently to a
  fallback. Use system stacks, or inline the face as a `@font-face` data URI.
- **No external images.** Same CSP. Hence the placeholder-and-build step.
- **Long words need condensed display faces.** Portuguese and Spanish headlines
  overflow narrow columns in a normal-width face.
- **Verify by looking.** Every layout bug in this skill's [PITFALLS.md](PITFALLS.md)
  passed a green automated check and was caught by reading a screenshot.

## Before publishing

- [ ] `shots.js` reports no overflow, no JS errors, and acceptable crop
- [ ] Screenshots of every slide actually reviewed
- [ ] Print path checked if a PDF or Google Slides bridge is wanted
- [ ] Any invented fact — a date, a distance, a caption — flagged to the user
      as yours, not theirs

Read [PITFALLS.md](PITFALLS.md) before writing CSS. It is a list of bugs that
already cost time, several of which bite twice in one deck.
