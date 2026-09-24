# The Beauty Midrand — thebeauty.co.za

Static site served by GitHub Pages. No build step: edit the files and push.

**Concept: the brushstroke ring.** The ring from the logo is the thread through the whole site.
In the hero it is painted live in liquid gold (a WebGL shader) and catches the light wherever the
pointer is; it frames each ritual, circles the active menu tab, draws itself around links on hover,
and turns up again on the team monograms, the map pin and the 404 page.

```
index.html                 the page: hero, marquee, welcome, rituals (face, body, nails),
                           menu & prices, reviews, team, mobile visits, visit (hours + map), footer
404.html                   "wandered off for a pedicure" page (GitHub Pages serves it automatically)
assets/css/site.css        design tokens at the top, then one block per section in page order
assets/js/main.js          hours and live open/closed status, menu tabs, mobile menu, reviews rail,
                           smooth scrolling and all motion (the page is complete without it)
assets/js/ring.js          the liquid-gold brush ring shader in the hero
assets/js/rituals.js       the three ritual artworks: pearl (face), silk (body), gel swatch fan (nails)
assets/vendor/             GSAP 3.13: core, ScrollTrigger, ScrollSmoother, SplitText, DrawSVG
                           (self-hosted; GSAP and its plugins are free to use)
assets/fonts/              Anton, Bodoni Moda, Outfit (Latin subsets, OFL licences)
images/                    the original logo files (logo-dark.jpg is used in the footer)
favicon.png                unchanged
og-image.jpg               1200 × 630 link preview for WhatsApp and social media
```

## Brand
Ink `#0C0A09`, bone `#F4EFE7`, gold `#C9A96E` (highlight `#EAD5A6`, deep `#9A7840`).
Anton for the name and big words (as in the logo), Bodoni Moda for headings and prices,
Outfit for reading.

## Common edits
- **Prices and treatments**: the menu is in `index.html` inside `<section class="menu">`. Each
  treatment is one `<li>` with its name, time and price. The short lists in the three ritual
  panels (search `class="mini"`) repeat a few of those prices, so update them together.
- **Opening hours**: change them in four places: the `HOURS` line near the top of
  `assets/js/main.js` (drives the live "Open now" status), the hours table in `index.html`
  (search `hours__table`), the footer hours, and `openingHoursSpecification` in the JSON-LD at the
  top of `index.html`.
- **Rating and review count**: search `665` in `index.html` (hero chip, welcome badge, reviews,
  meta description and the link-preview line).
- **Reviews**: each card is an `<li class="review">` in the reviews section.
- **Phone / WhatsApp**: search `27815942178`.
- **Booking link**: search `fresha.com` (every Book button points to the Fresha page).

## Performance and accessibility
No photos: the artwork is drawn in code. About 200 KB of scripts before compression (most of it
GSAP) plus about 110 KB of fonts. The hero shader and the ritual canvases pause when off-screen,
and the shader drops its resolution on slow devices. Visitors with "reduce motion" switched on get
a still, complete page with no smooth scrolling, custom cursor or animation. Menu categories are
keyboard tabs (arrow keys, Home, End); the reviews rail scrolls with the arrow keys.
