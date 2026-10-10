import { defineConfig } from 'vite';

// base './' lets the app work under any path on GitHub Pages.
// Files in public/engine (the Stockfish worker and wasm) are copied as-is
// into dist/engine so the engine loads from this app's own origin with no
// network call to a third party.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
