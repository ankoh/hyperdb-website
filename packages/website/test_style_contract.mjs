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

test('particle gazelle uses exactly 12 shared light/dark tones', () => {
  const svg = readFileSync(join(source, 'assets/gazelle_fading_circles.svg'), 'utf8');
  const palette = readFileSync(join(source, 'layouts/theme.module.css'), 'utf8');
  const circles = [...svg.matchAll(/<circle\b[^>]*>/g)];
  assert.ok(circles.length > 0, 'particle artwork must contain circles');
  const fills = new Set();
  for (const [circle] of circles) {
    const fill = circle.match(/fill="var\((--gazelle-particle-\d{2}), currentColor\)"/);
    assert.ok(fill, 'each circle must use a shared tone with a currentColor fallback');
    fills.add(fill[1]);
  }
  assert.equal(fills.size, 12);
  assert.match(palette, /--gazelle-point-opacity:\s*(?:0(?:\.\d+)?|1(?:\.0+)?);/, 'define a shared point opacity between 0 and 1');
  for (let index = 1; index <= 12; index++) {
    const token = `--gazelle-particle-${String(index).padStart(2, '0')}`;
    assert.ok(fills.has(token), `${token}: missing artwork tone`);
    assert.match(palette, new RegExp(`${token}:\\s*light-dark\\(hsla\\([^()]+var\\(--gazelle-point-opacity\\)\\),\\s*hsla\\([^()]+var\\(--gazelle-point-opacity\\)\\)\\)`), `${token}: missing theme pair with shared point opacity`);
  }
  assert.doesNotMatch(svg, /\b(?:id|data-method|width|height)="|#[\da-f]{3,8}\b/i, 'omit extraction metadata, oversized dimensions, and fixed colors');
});

test('generated syntax highlighting uses the shared palette', () => {
  const palette = readFileSync(join(source, 'layouts/theme.module.css'), 'utf8');
  for (const route of ['index.html', 'docs/hello-world/index.html']) {
    const html = readFileSync(join(source, '../pages', route), 'utf8');
    const blocks = [...html.matchAll(/<pre\b[^>]*class="astro-code[^]*?<\/pre>/g)];
    assert.ok(blocks.length > 0, `${route}: should exercise Astro syntax highlighting`);
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

test('static pages link their CSS Module stylesheets', () => {
  const pages = join(source, '../pages');
  for (const route of ['index.html', 'docs/hello-world/index.html']) {
    const html = readFileSync(join(pages, route), 'utf8');
    const links = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)];
    assert.ok(links.length > 0, `${route}: missing stylesheet links`);
    const css = links.map((match) => readFileSync(join(pages, match[1]), 'utf8')).join('\n');
    assert.ok(css.trim().length > 0, `${route}: empty stylesheets`);
  }
});
