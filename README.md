<p align="center">
  <img src="packages/website/src/assets/hyper_banner.svg" width="300" alt="HyperDB">
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

GitHub Actions deploys `main` automatically. Configure the repository secrets
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` for deployment.
