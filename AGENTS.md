# Website Styling

- Use lowercase `snake_case` filenames for authored components, layouts, stylesheets, and assets. Keep framework-required filenames, public route names, and vendored font filenames unchanged; component identifiers remain PascalCase.
- Author component and page styles in CSS Modules (`*.module.css`). Import their class mappings; let Astro/Vite deliver the CSS.
- Keep the shared UI palette in `packages/website/src/layouts/theme.module.css`. Components consume semantic custom properties, not hardcoded colors or component-specific light/dark palettes.
- Define light/dark pairs with `light-dark()`. The root `color-scheme` follows the OS unless `data-theme` explicitly selects light or dark. Do not resolve OS colors in JavaScript.
- Theme JavaScript may manage preference persistence and the root `data-theme` attribute only. Do not add React style props, DOM style mutations, or JavaScript-generated theme CSS.
- Generated syntax-highlighting markup must reference the theme's CSS variables, not embed a fixed palette. Branded artwork may retain its original colors on an intentional fixed light surface.
- Check landing pages, docs, and React dialogs in both schemes. Verify system changes, saved preferences, keyboard focus, and narrow screens when changing the theme.
