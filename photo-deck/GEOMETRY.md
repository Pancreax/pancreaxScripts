# Geometry and photo treatments

## Why this matters

A 16:9 slide is 1.78. Phone photos are 1.33 (4:3 landscape) or 0.75 (3:4
portrait). Filling the slide with `object-fit: cover` throws away **25% of a
landscape photo's height and 44% of a portrait's width**. On a deck built from
someone's own travel photographs, that is the difference between showing their
picture and showing a crop of it.

Measure crop before defending it. `shots.js` reports it per photo; eyeball
estimates are unreliable — in one deck the real figure was 18% where the guess
had been 7%, because the estimate ignored the gap and the rail.

## The split formula

For a photo that must survive whole at full slide height:

```
photo_region = slide_height × photo_ratio
text_column  = grid_width − photo_region − gap
grid_width   = slide_width − rail          (rail on the text side only)
```

Worked example, 1440×810 slide, rail 65, gap 37:

| Photo | Ratio | Region needed | Text column | As % |
|---|---|---|---|---|
| 3:4 portrait | 0.75 | 607 | 731 | 53% |
| 5:4 landscape | 1.27 | 1032 | 306 | 22% |
| 4:3 landscape | 1.33 | 1080 | 258 | 19% |

Note how a portrait photo hands most of the slide to the text and a landscape
photo takes it back. That inversion is the whole point, and it is easy to get
backwards when reasoning from intuition instead of the numbers.

Set the column with a CSS variable per slide so each can differ:

```css
.slide.photo-side       { grid-template-columns: minmax(0, var(--textw, 33%)) minmax(0, 1fr); }
.slide.photo-side.flip  { grid-template-columns: minmax(0, 1fr) minmax(0, var(--textw, 33%)); }
```

Then scale the type to the column it lives in — a narrow column needs its own
`--fs-hero`, or long words wrap into four lines.

## Three treatments

**Three-side bleed.** Photo runs off the top, bottom and one side; text sits
on solid ground beside it. Keeps the drama of a full bleed, cuts the crop, and
retires the scrim entirely because type is no longer over the image. The
default choice for a photo with a text partner.

**Whole frame (`contain`).** When the crop must be exactly zero, size the
region to the ratio *and* use `object-fit: contain` as a guard for the last
few pixels. Give the container the page's ground colour so any residual band
is invisible.

**Gallery.** One photo per slide, no text, each shown whole and centred.
Landscape nearly fills the frame; portrait sits tall and narrow with ground
either side. That unevenness is honest — do not crop portraits to match.

Mix treatments deliberately and let each be justified by the photograph, not
by variety for its own sake. A 16:9-native photo genuinely belongs full-bleed;
the same photo in a narrow column would crop *worse*.

## Edge fade: overlay, never mask

To dissolve a photo's inner edge into the page:

```css
/* right: photo on the right of the slide, fading on its left edge */
.shot::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  --fade: 4.3%;
  background: linear-gradient(to right, var(--ground) 0%, transparent var(--fade));
}
```

**Do not use `mask-image` to fade to transparent.** Where the photo's edge is
bright — sky, sand, snow — dissolving into a dark page produces a grey ramp
that reads as a printing defect. Overlaying the exact ground colour reads as a
vignette on light and dark edges alike.

Keep the fade narrow. ~4% of the width is a softened edge; ~13% eats visible
picture. Drive it from one custom property so it can be tuned in one place.

## White-background catalogue shots on a dark deck

Product photos on white are common when illustrating equipment. Two options:

**Preferred — light panel plus multiply.** Put the image on a panel in a warm
off-white from the palette and set `mix-blend-mode: multiply`. The backdrop
becomes the panel colour and disappears, *including regions sealed inside the
subject* (inside a bike frame, inside wheels).

```css
.frame:has(img.on[data-panel="light"]) { background: var(--bone); }
.frame [data-panel="light"] img        { mix-blend-mode: multiply; }
```

**Avoid — background knock-out.** A flood fill from the image border cannot
reach enclosed regions, so they stay white while the outside goes transparent.
The result looks worse than doing nothing. A global white key is worse still
when the subject itself is white.

## Slide builds

For a taxonomy the presenter walks through, put the steps *inside one slide*
rather than making one slide each: arrows advance the step and only move on
after the last, exactly like a Keynote build. Entering the slide backwards
must land on the *last* step, or reverse navigation feels broken.

`scripts/deck-nav.js` implements this. A build has no equivalent in print —
see PITFALLS.md for the contact-sheet fallback.
