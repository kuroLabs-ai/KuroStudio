import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// ESM-safe __dirname replacement
const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: '.',
  base: './',
  plugins: [
    react(), // Enables React Fast Refresh + automatic JSX runtime
  ],
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    // Separate electron main from renderer
    rollupOptions: {
      external: ['electron'],
    },
  },
  resolve: {
    alias: {
      // Resolve workspace packages directly from source (no build step needed)
      '@kuro/shared':         fileURLToPath(new URL('../../packages/shared/src/index.ts',         import.meta.url)),
      '@kuro/project-format': fileURLToPath(new URL('../../packages/project-format/src/index.ts', import.meta.url)),
      '@kuro/editor-core':    fileURLToPath(new URL('../../packages/editor-core/src/index.ts',    import.meta.url)),
      '@kuro/ai-core':        fileURLToPath(new URL('../../packages/ai-core/src/index.ts',        import.meta.url)),
      '@kuro/ai-providers':   fileURLToPath(new URL('../../packages/ai-providers/src/index.ts',   import.meta.url)),
      '@kuro/audio-engine':   fileURLToPath(new URL('../../packages/audio-engine/src/index.ts',   import.meta.url)),
      '@kuro/media-engine':   fileURLToPath(new URL('../../packages/media-engine/src/index.ts',   import.meta.url)),
      '@kuro/remotion-bridge':fileURLToPath(new URL('../../packages/remotion-bridge/src/index.ts',import.meta.url)),
      '@kuro/store':          fileURLToPath(new URL('../../packages/store/src/index.ts',          import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
