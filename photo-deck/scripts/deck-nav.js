// Presenter navigation for a scroll-snap deck. Drop inline at the end of the
// page — no build step, no dependencies.
//
// Markup contract:
//   .deck                     scroll container, tabindex="0"
//   .slide                    one per slide
//   .slide[data-steps="6"]    slide holds a build of 6 steps
//   [data-step="0..n"]        elements belonging to a step; the active one
//                             gets .on (list rows, photos, captions — anything)
//   .picker button[data-go]   optional: click to jump straight to a step
//
// Keys: → ↓ space / PageDown advance (through steps first), ← ↑ PageUp go back,
//       Home / End jump to the ends, F toggles fullscreen.
//
// Fires `slidechange` on the deck with { index, total, slide } so the page can
// update its own chrome (counter, progress, section name) without this file
// knowing anything about it.

(function () {
  var deck = document.querySelector('.deck');
  if (!deck) return;
  var slides = [].slice.call(deck.querySelectorAll('.slide'));
  var n = slides.length;
  if (!n) return;

  var steps = slides.map(function (s) { return +(s.dataset.steps || 0); });
  var stepAt = slides.map(function () { return 0; });
  var current = -1;
  var enterAtEnd = false;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function applyStep(i) {
    if (!steps[i]) return;
    var k = stepAt[i];
    slides[i].querySelectorAll('[data-step]').forEach(function (el) {
      el.classList.toggle('on', +el.dataset.step === k);
    });
    slides[i].querySelectorAll('.picker li').forEach(function (li, idx) {
      li.classList.toggle('on', idx === k);
    });
  }

  function enter(i) {
    if (i !== current) {
      current = i;
      deck.dispatchEvent(new CustomEvent('slidechange', {
        detail: { index: i, total: n, slide: slides[i] }
      }));
    }
    if (steps[i]) {
      // Arriving backwards must land on the LAST step, or reverse navigation
      // feels broken — you leave a build and re-enter it at the beginning.
      stepAt[i] = enterAtEnd ? steps[i] - 1 : 0;
      applyStep(i);
    }
    enterAtEnd = false;
  }

  // -45% margins: the slide occupying the middle of the viewport is current.
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) enter(slides.indexOf(e.target));
    });
  }, { root: deck, rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  slides.forEach(function (s) { io.observe(s); });
  enter(0);

  function go(i, atEnd) {
    i = Math.max(0, Math.min(n - 1, i));
    if (i === current) return;
    enterAtEnd = !!atEnd;
    slides[i].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }

  function next() {
    if (steps[current] && stepAt[current] < steps[current] - 1) {
      stepAt[current]++; applyStep(current); return;
    }
    go(current + 1);
  }

  function prev() {
    if (steps[current] && stepAt[current] > 0) {
      stepAt[current]--; applyStep(current); return;
    }
    go(current - 1, true);
  }

  deck.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.picker button[data-go]');
    if (!b) return;
    var i = slides.indexOf(b.closest('.slide'));
    if (i < 0) return;
    stepAt[i] = +b.dataset.go;
    applyStep(i);
  });

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ') next();
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') prev();
    else if (k === 'Home') go(0);
    else if (k === 'End') go(n - 1);
    else if (k === 'f' || k === 'F') {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    } else return;
    e.preventDefault();
    deck.dispatchEvent(new CustomEvent('decknav'));
  });

  deck.focus({ preventScroll: true });
})();
