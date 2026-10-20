import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { buildKnowledge } from './src/lib/knowledge.ts'

/** Publishes the portfolio's facts as /knowledge.txt for the AI chat Worker. */
function knowledge(): Plugin {
  return {
    name: 'portfolio-knowledge',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'knowledge.txt', source: buildKnowledge() })
    },
    configureServer(server) {
      server.middlewares.use('/knowledge.txt', (_req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(buildKnowledge())
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works on a GitHub Pages user site (/) or project site (/repo/).
  base: './',
  plugins: [react(), knowledge()],
  build: {
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      output: {
        // React stays in the entry graph; three and the R3F stack load only with
        // the lazy 3D scene. Higher priority wins, so the R3F group never pulls
        // React (one of its dependencies) out of the initial bundle.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
            { name: 'three', test: /node_modules[\\/]three[\\/]/, priority: 20 },
            {
              name: 'r3f',
              test: /node_modules[\\/](@react-three|postprocessing|maath|troika-|three-|zustand|its-fine|suspend-react|use-sync-external-store|@monogrid|@use-gesture)/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
})
