import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { resolve } from 'node:path';

const wasmDir = resolve(process.cwd(), '__WASM_DIR__');

export default defineConfig({
  site: 'https://hyperdb.de',
  output: 'static',
  integrations: [mdx(), react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  vite: {
    optimizeDeps: {
      exclude: ['hyperdb-worker-url', 'hyperdb-engine-url', 'hyperdb-wasm-url'],
    },
    resolve: {
      alias: {
        'hyperdb-worker-url': `${wasmDir}/browser_worker.js?url`,
        'hyperdb-engine-url': `${wasmDir}/hyperdb-wasm.js?url`,
        'hyperdb-wasm-url': `${wasmDir}/hyperdb-wasm.wasm.br?url`,
      },
    },
  },
});
