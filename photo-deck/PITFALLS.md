# Pitfalls

Every one of these shipped a broken slide past a green automated check.

## `height: 100%` inside an auto-sized track

**Bites twice per deck.** An image with `width/height: 100%` or
`max-height: 100%` placed as a grid item in an implicitly sized row has
nothing to resolve the percentage against — the row is sized *by* the item.
The percentage falls back to auto, the image renders at intrinsic size and
overflows a fixed-ratio container, which then clips it.

Symptom: a photo in a `aspect-ratio: 3/2` frame renders square and cropped; a
centred gallery photo has its bottom cut off.

Two fixes, depending on the case:

```css
/* stacked layers in a fixed-ratio frame → take them out of flow */
.frame        { position: relative; }
.frame .layer { position: absolute; inset: 0; }

/* a single centred item → give the track a definite size */
.gallery { display: grid; grid-template: minmax(0, 1fr) / minmax(0, 1fr); place-items: center; }
```

## Chrome lays print out narrower than the paper

`--print-to-pdf` and `page.pdf()` compute layout at a width below the paper
box, which fires mobile breakpoints and stacks every multi-column slide. The
`@media (max-width: N)` rules win because they matched.

Re-declare the desktop grids inside `@media print`, after the mobile query:

```css
@media print {
  .split      { grid-template-columns: 1.05fr .95fr; }
  .grid-cards { grid-template-columns: repeat(3, 1fr); }
  .slide      { justify-content: center; overflow: hidden; }
  .frame      { max-height: 100mm; }   /* vh is unreliable here — use mm */
}
```

Passing `--window-size` does **not** help; print layout ignores it.

## Builds do not exist in print

Steps inside a slide render at whatever step is current, so a printed page
loses every other photo silently. Open them into a contact sheet:

```css
@media print {
  .frame-bike        { aspect-ratio: auto; height: 92mm; display: grid;
                       grid-template-columns: repeat(3, 1fr); gap: 2mm; }
  .frame-bike .layer { position: static; opacity: 1; }
  .picker .on button { background: none; }   /* mark all, not just active */
}
```

## A verifier that skips a slide type reports success

An overflow check written against one slide's structure returns `null` for
every other structure, which `.filter(Boolean)` then discards — so 17 broken
gallery slides reported clean. Check **every** slide, and make the absence of
a known structure a failure rather than a skip. `scripts/shots.js` walks all
in-flow children instead of a named container, for exactly this reason.

## Build-token regex that is too narrow fails twice

A placeholder pattern of `__IMG_([A-Z]+)__` does not match `__IMG_BT_SPEED__`.
Worse, the *leftover check* used the same pattern, so unsubstituted tokens
reported clean and shipped as broken image links. Use `[A-Z0-9_]+` in both
places, and make sure the guard cannot share the blind spot of the thing it
guards.

## Sage-grey text dies over photographs

A muted secondary colour that reads well on a solid panel disappears over
water, sand, or a bright wall. On photo slides, lift the supporting copy and
give it a floor:

```css
.bleed ~ .stage .note { color: #D8DED4; }
.bleed ~ .stage .note,
.bleed ~ .stage .title { text-shadow: 0 2px 22px rgba(0,0,0,.8); }
```

Better still, move the text onto solid ground — see three-side bleed in
GEOMETRY.md.

## Scrim as a wall instead of a pool

A full-height linear gradient across half the slide flattens the photograph
wherever the subject happens to be. Anchor a radial pool under the text block
instead, and move the anchor to whichever side the subject is *not* on:

```css
.scrim { --anchor-x: 0%;
  background: radial-gradient(88% 112% at var(--anchor-x) 45%,
    rgba(0,0,0,.95), rgba(0,0,0,.86) 32%, rgba(0,0,0,.55) 58%, transparent 84%); }
.scrim.right { --anchor-x: 100%; }
```

## Silent image-conversion failures

`sips` returns success and writes nothing when the extension is guessed wrong
(`file.webp` that is actually `.jpg`). The missing image only surfaces later
as a broken slide. Always list the output directory and confirm the count.

## Size images to where they are displayed

A photo promoted from a full-bleed hero to a small framed inset keeps its old
resolution and silently triples the file. Re-derive every size from the
rendered box after any layout change; it recovered ~1 MB in one deck.
