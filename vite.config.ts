import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works on a GitHub Pages user site (/) or project site (/repo/).
  base: './',
  plugins: [react()],
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
