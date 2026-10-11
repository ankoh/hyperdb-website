import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const source = join(dirname(fileURLToPath(import.meta.url)), 'src');
function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : [file];
  });
}
const files = sourceFiles(source);
const pages = join(source, '../pages');
const htmlPages = sourceFiles(pages).filter((file) => file.endsWith('.html'));

test('authored UI and SVG filenames use snake_case', () => {
  for (const file of files) {
    const path = relative(source, file);
    if (!/^(components|layouts|islands)\//.test(path) && !path.endsWith('.svg')) continue;
    assert.match(path.split('/').at(-1), /^[a-z][a-z0-9_]*(?:\.module)?\.(?:astro|tsx?|css|svg)$/, `${path}: use snake_case filenames`);
  }
});

test('authored styles live in CSS Modules and the shared palette', () => {
  for (const file of files) {
    const path = relative(source, file);
    if (!/\.(css|astro|tsx?|mdx)$/.test(file)) continue;
    const content = readFileSync(file, 'utf8');
    if (file.endsWith('.css')) {
      assert.ok(file.endsWith('.module.css'), `${path}: use CSS Modules`);
      if (path !== 'layouts/theme.module.css') {
        assert.doesNotMatch(content, /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|light-dark)\s*\(/i, `${path}: use shared color tokens`);
        for (const declaration of content.matchAll(/(?:^|[;{])\s*(?:color|background(?:-color)?|(?:outline|border)(?:-(?:top|right|bottom|left|block|inline))?(?:-color)?)\s*:\s*([^;}]+)/g)) {
          assert.match(declaration[1], /var\(|^(?:inherit|transparent|currentColor|none|0)\s*$/i, `${path}: use semantic colors`);
        }
      }
    } else {
      assert.doesNotMatch(content, /<style\b|\bstyle\s*=|\.style\s*[.\[]|\.module\.css\?inline/, `${path}: keep styles out of markup and JavaScript`);
    }
  }
});

test('generated syntax highlighting uses the shared palette', () => {
  const palette = readFileSync(join(source, 'layouts/theme.module.css'), 'utf8');
  for (const file of htmlPages) {
    const route = relative(pages, file);
    const html = readFileSync(file, 'utf8');
    const blocks = [...html.matchAll(/<pre\b[^>]*class="astro-code[^]*?<\/pre>/g)];
    for (const [code] of blocks) {
      const variables = [...code.matchAll(/var\((--[\w-]+)\)/g)].map((match) => match[1]);
      assert.ok(variables.length > 0, `${route}: generated styles must reference CSS variables`);
      for (const variable of new Set(variables)) {
        assert.ok(palette.includes(`${variable}:`), `${variable}: missing shared token`);
      }
      assert.doesNotMatch(code, /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i, `${route}: do not embed a fixed highlighter palette`);
    }
  }
});

test('hero SVG fills reference shared theme tokens', () => {
  const palette = readFileSync(join(source, 'layouts/theme.module.css'), 'utf8');
  const hyper = readFileSync(join(source, 'assets/hyper_hero.svg'), 'utf8');
  const gazelle = readFileSync(join(source, 'assets/gazelle_fill.svg'), 'utf8');
  const heroStyles = readFileSync(join(source, 'pages/index.module.css'), 'utf8');
  for (const token of ['--hyper-disk-top', '--hyper-disk-middle', '--hyper-disk-bottom', '--hyper-cap', '--gazelle-outline', '--gazelle-accent']) {
    assert.ok(palette.includes(`${token}: light-dark(`), `${token}: missing shared light/dark token`);
    assert.ok((token.startsWith('--hyper') ? hyper : gazelle).includes(`var(${token},`), `${token}: SVG fill must consume the token`);
  }
  assert.ok(palette.includes('--gazelle-fill-color: light-dark('));
  assert.match(heroStyles, /--gazelle-fill:\s*var\(--gazelle-fill-color\)/);
  assert.ok(gazelle.includes('var(--gazelle-fill,'));
});

test('federation brand logo retains its external SVG symbol', () => {
  const hyper = readFileSync(join(source, 'assets/hyper.svg'), 'utf8');
  assert.match(hyper, /<symbol\b[^>]*id="hyper"[^>]*viewBox="[^"]+"/);
  assert.doesNotMatch(hyper, /var\(--hyper-/);
});

test('static pages link their CSS Module stylesheets', () => {
  assert.ok(htmlPages.length > 0, 'build should produce HTML pages');
  for (const file of htmlPages) {
    const route = relative(pages, file);
    const html = readFileSync(file, 'utf8');
    const links = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)];
    assert.ok(links.length > 0, `${route}: missing stylesheet links`);
    const css = links.map((match) => readFileSync(join(pages, match[1]), 'utf8')).join('\n');
    assert.ok(css.trim().length > 0, `${route}: empty stylesheets`);
  }
});

test('theme switches have accessible names and checked states', () => {
  for (const file of htmlPages) {
    const route = relative(pages, file);
    const html = readFileSync(file, 'utf8');
    for (const [toggle] of html.matchAll(/<button\b[^>]*data-theme-preference[^>]*>/g)) {
      assert.match(toggle, /type="button"/, `${route}: theme toggle should not submit forms`);
      assert.match(toggle, /aria-label="[^"]*[^\s"][^"]*"/, `${route}: theme toggle needs an accessible name`);
      assert.match(toggle, /role="switch"/, `${route}: theme toggle should expose switch semantics`);
      assert.match(toggle, /aria-checked="(?:true|false)"/, `${route}: theme switch needs a checked state`);
    }
  }
});

test('informative SVG diagrams have accessible descriptions', () => {
  for (const file of htmlPages) {
    const route = relative(pages, file);
    const html = readFileSync(file, 'utf8');
    for (const [svg] of html.matchAll(/<svg\b[^>]*role="img"[^>]*>/g)) {
      assert.match(svg, /aria-label="[^"]*[^\s"][^"]*"/, `${route}: informative diagram needs an accessible description`);
    }
  }
});

test('experiments opt out of indexing', () => {
  const html = readFileSync(join(pages, 'experiments/index.html'), 'utf8');
  const robots = html.match(/<meta\b[^>]*name="robots"[^>]*>/)?.[0];
  assert.ok(robots, 'experiments should declare a robots policy');
  assert.match(robots, /content="[^"]*\bnoindex\b[^"]*"/);
  assert.match(robots, /content="[^"]*\bnofollow\b[^"]*"/);
});
