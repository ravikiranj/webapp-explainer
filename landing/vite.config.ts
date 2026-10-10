import { defineConfig } from 'vite';

// base './' lets the landing page work under any path on GitHub Pages,
// for example https://<user>.github.io/<repo>/.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
