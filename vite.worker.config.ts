import { defineConfig } from 'vite';

/**
 * The Sites Worker is uploaded as one ES module, so the API is bundled with the
 * same Vite already in the project. `npm run build` produces the client assets
 * that the Worker serves through its ASSETS binding.
 */
export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'worker-dist',
    emptyOutDir: true,
    minify: true,
    lib: {
      entry: 'worker/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      output: { entryFileNames: 'index.js' },
    },
  },
});
