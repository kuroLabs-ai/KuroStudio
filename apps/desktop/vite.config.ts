import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@kuro/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@kuro/project-format': path.resolve(__dirname, '../../packages/project-format/src/index.ts'),
      '@kuro/editor-core': path.resolve(__dirname, '../../packages/editor-core/src/index.ts'),
      '@kuro/ai-core': path.resolve(__dirname, '../../packages/ai-core/src/index.ts'),
      '@kuro/ai-providers': path.resolve(__dirname, '../../packages/ai-providers/src/index.ts'),
      '@kuro/audio-engine': path.resolve(__dirname, '../../packages/audio-engine/src/index.ts'),
      '@kuro/media-engine': path.resolve(__dirname, '../../packages/media-engine/src/index.ts'),
      '@kuro/remotion-bridge': path.resolve(__dirname, '../../packages/remotion-bridge/src/index.ts'),
      '@kuro/store': path.resolve(__dirname, '../../packages/store/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
