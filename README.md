# The Note — Md. Akram Khan's portfolio

A dark, Death Note–inspired 3D portfolio. A black notebook floats in the dark; scrolling opens it.
Its rules ("How to Use It") are the About section, the names written in it are projects, the
Shinigami Eyes reveal skills, and the last page invites you to write a name (contact).

Built with Vite, React 19, TypeScript, three.js, @react-three/fiber, drei and postprocessing.
Every texture is drawn at runtime on a canvas and every font is self-hosted, so the site makes no
network requests beyond its own files.

## Scripts

```sh
npm install
npm run dev        # local dev server
npm run build      # typecheck (tsc -b) + production build into dist/
npm run preview    # serve dist/
npm run lint       # oxlint
npm run typecheck  # tsc only
```

The build uses a relative base (`./`), so `dist/` works on a GitHub Pages user or project site.

## Where things live

- `src/data/portfolio.ts` — all content (profile, rules, projects, skills). Edit facts here only.
- `src/sections/`, `src/components/` — the HTML page; each component has its own CSS file.
- `src/three/` — the 3D scene: `Experience` (canvas, quality tiers, error fallback), `NotebookRig` +
  `Notebook` (the book and its scroll choreography), `Stage`, `Apple`, `Atmosphere`,
  `ShinigamiEyes`, `CameraRig`, `Effects`, and `SceneFallback` (CSS version used without WebGL).
- `src/lib/scroll.ts` — shared scroll/pointer state read by the 3D scene every frame.

Content never waits for the 3D scene: the canvas is code-split, purely decorative (`aria-hidden`,
no pointer events) and replaced by a static CSS scene if WebGL is missing or crashes.
`prefers-reduced-motion` turns off parallax, idle motion and reveal animations.

## Visual QA

```sh
npm run build
node scripts/shoot.mjs shots                     # desktop 1440×900 + mobile 390×844
node scripts/shoot.mjs shots --motion=reduce     # reduced motion
node scripts/shoot.mjs shots --wait=9000         # let the 3D settle (headless WebGL is slow)
```

Screenshots are saved as `<viewport>-<section>.png`; console errors and horizontal overflow are
printed at the end. Headless Edge renders WebGL in software, so build with `VITE_QUALITY=high` to
keep post-processing on while shooting.

## Credits

Fonts (SIL Open Font License, see `public/fonts/OFL-*.txt`): UnifrakturMaguntia, IM Fell English,
Cormorant Garamond, Caveat, Share Tech Mono.

A fan-made tribute. Death Note belongs to Tsugumi Ohba, Takeshi Obata and Shueisha; this site is
not affiliated with them.
