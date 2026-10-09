import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { dirname, resolve } from 'node:path';
import { realpathSync } from 'node:fs';

const wasmDir = resolve(process.cwd(), '__WASM_DIR__');
const svgSymbolsPath = resolve(process.cwd(), '__SVG_SYMBOLS_PATH__');

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
    server: {
      fs: {
        allow: [resolve(process.cwd(), '../..'), realpathSync(dirname(svgSymbolsPath))],
      },
    },
    build: {
      assetsInlineLimit: 0,
    },
    optimizeDeps: {
      exclude: ['hyperdb-worker-url', 'hyperdb-engine-url', 'hyperdb-wasm-url'],
    },
    resolve: {
      alias: {
        'hyperdb-symbol-atlas': `${svgSymbolsPath}?url`,
        'hyperdb-worker-url': `${wasmDir}/browser_worker.js?url`,
        'hyperdb-engine-url': `${wasmDir}/hyperdb-wasm.js?url`,
        'hyperdb-wasm-url': `${wasmDir}/hyperdb-wasm.wasm.br?url`,
      },
    },
  },
});
