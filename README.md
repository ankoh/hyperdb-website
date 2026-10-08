# HyperDB website

An Astro/TypeScript static website for [hyperdb.de](https://hyperdb.de), presenting Hyper as a fast database for analytical queries. React islands and CSS Modules support optional interactive examples in the documentation.

## Development

Install dependencies with `pnpm install`, then run `bazel run //packages/website:dev`. The dev target generates a local Astro config from the same template used by the Bazel build. The SQL playground downloads `hyperdb-wasm` only after clicking **Run query**; it requires a cross-origin-isolated browser with WebAssembly memory64 and OPFS support.

## Build and deploy

`bazel build //packages/website:pages_deploy` produces `bazel-bin/packages/website/pages_deploy/`. Deploy that directory to the **hyperdb** Cloudflare Pages project (custom domain `hyperdb.de`) with `wrangler pages deploy bazel-bin/packages/website/pages_deploy --project-name=hyperdb --branch=main`. The build is static: no Cloudflare Worker or Astro server adapter is required. The `public/_headers` file configures cross-origin isolation and the compressed WASM asset for the SQL example.

The GitHub workflow checks and builds on pull requests, then deploys the prebuilt output on `main`. Create the Pages project and attach the custom domain first; configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets. CI does not install the app with pnpm: Bazel resolves its packages from `pnpm-lock.yaml`.
