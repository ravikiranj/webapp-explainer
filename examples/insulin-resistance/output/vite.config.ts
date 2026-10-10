import { defineConfig } from 'vite';

// base './' lets the built app work under any path on GitHub Pages
// (for example /webapp-explainer/examples/rate-limiter/).
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
