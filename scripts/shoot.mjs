// Visual QA: serves the production build and captures screenshots at several
// scroll positions on desktop and mobile, using the locally installed Microsoft Edge.
//
//   npm run build && node scripts/shoot.mjs [outDir] [--only=desktop|mobile] [--motion=reduce] [--dist=path]
//
// --dist serves a build from another folder (e.g. `npx vite build --outDir <dir>`),
// so several people/agents can build and shoot at the same time without clobbering dist/.
//
// Prints console errors / page errors from the browser so WebGL or runtime
// problems are visible. Screenshots are named <viewport>-<section>.png.
import { preview } from 'vite'
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const outDir = resolve(args.find((a) => !a.startsWith('--')) ?? 'shots')
const only = args.find((a) => a.startsWith('--only='))?.split('=')[1]
const motion = args.find((a) => a.startsWith('--motion='))?.split('=')[1] ?? 'no-preference'
const dist = args.find((a) => a.startsWith('--dist='))?.split('=')[1]
mkdirSync(outDir, { recursive: true })

const viewports = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
].filter((v) => !only || v.name === only)

const sections = ['hero', 'rules', 'names', 'eyes', 'contact']

const server = await preview({
  preview: { port: 4173, strictPort: false },
  ...(dist ? { build: { outDir: resolve(dist) } } : {}),
  logLevel: 'error',
})
const url = server.resolvedUrls.local[0]
const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})

const errors = []
try {
  for (const vp of viewports) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
      reducedMotion: motion,
    })
    const page = await ctx.newPage()
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${vp.name}] console.${m.type()}: ${m.text()}`)
    })
    page.on('pageerror', (e) => errors.push(`[${vp.name}] pageerror: ${e.message}`))
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(4500) // intro + 3D warm-up
    const webgl = await page.evaluate(() => !!document.querySelector('canvas'))
    console.log(`[${vp.name}] canvas present: ${webgl}`)

    for (const id of sections) {
      await page.evaluate((sid) => {
        const el = document.getElementById(sid)
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
      }, id)
      await page.waitForTimeout(1600) // let damped 3D motion settle
      const file = resolve(outDir, `${vp.name}-${id}.png`)
      await page.screenshot({ path: file })
      console.log(`saved ${file}`)
    }
    // Horizontal overflow check (no sideways scrolling allowed).
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (overflow > 0) errors.push(`[${vp.name}] horizontal overflow of ${overflow}px`)
    await ctx.close()
  }
} finally {
  await browser.close()
  await new Promise((r) => server.httpServer.close(r))
}

console.log(errors.length ? `\n${errors.length} problem(s):\n${errors.join('\n')}` : '\nNo console errors.')
