<p align="center">
  <img src="packages/website/src/assets/hyper_banner.svg" width="240" alt="HyperDB">
</p>

## Building

Requires Bazel 9.3.0, selected by `.bazelversion`.

```sh
# Start the local development server
bazel run //packages/website:dev

# Run checks
bazel test //packages/website:check //packages/website:style_contract_test

# Build the static site
bazel build //packages/website:pages_deploy
```

The deployable site is written to `bazel-bin/packages/website/pages_deploy/`.
Deploy it to Cloudflare Pages with:

```sh
wrangler pages deploy bazel-bin/packages/website/pages_deploy \
  --project-name=hyperdb --branch=main
```

Cloudflare publishing is currently suspended. GitHub Actions still runs checks
and builds, but its deployment step is disabled in `.github/workflows/pages.yml`.
The manual command above is retained for when publishing resumes. Deployment
requires the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
