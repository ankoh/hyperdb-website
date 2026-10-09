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

test('the carousel timing matches its three-word content', () => {
  const content = readFileSync(join(source, 'components/landing_usecases.ts'), 'utf8');
  const words = content.match(/landingUsecases\s*=\s*\[([^\]]+)\]/)?.[1].match(/'[^']*'/g);
  assert.equal(words?.length, 3, 'Update the CSS Module keyframes when changing the word count');
});

test('the landing gazelle remains in the hero, not a property card', () => {
  const html = readFileSync(join(source, '../pages/index.html'), 'utf8');
  const hero = html.match(/<section\b[^>]*aria-label="Introducing HyperDB"[^]*?<\/section>/)?.[0];
  assert.ok(hero?.includes('#gazelle'), 'Keep the gazelle in the original hero');
  assert.ok(hero.includes('Web Shell'), 'Keep the hero web shell link');
  for (const [card] of html.matchAll(/<article\b[^]*?<\/article>/g)) {
    assert.ok(!card.includes('#gazelle'), 'The gazelle should not be a property card');
  }
});

test('the production card owns the query claim and colored atlas logos', () => {
  const pages = join(source, '../pages');
  const html = readFileSync(join(pages, 'index.html'), 'utf8');
  const card = html.match(/<article\b[^>]*id="production"[^]*?<\/article>/)?.[0];
  assert.ok(card?.includes('Powering Salesforce Data 360 and Tableau'));
  assert.ok(card.includes('billions of queries every day'));
  assert.equal([...html.matchAll(/billions of queries/g)].length, 1, 'Keep the query claim in one card');
  const graphic = card.match(/<div\b[^>]*data-graphic="brands"[^]*?<\/div>/)?.[0];
  assert.ok(graphic?.includes('aria-hidden="true"'), 'Brand artwork is decorative');
  for (const [id, color] of [['salesforce', '#00a1e0'], ['tableau', '#1f447e']]) {
    const href = graphic.match(new RegExp(`href="([^"]+)#${id}"`))?.[1];
    assert.ok(href?.startsWith('/_astro/'), `${id}: use the hashed atlas`);
    const atlas = readFileSync(join(pages, href), 'utf8');
    const symbol = atlas.match(new RegExp(`<symbol\\b[^>]*id="${id}"[^]*?<\\/symbol>`))?.[0];
    assert.ok(symbol?.includes(`fill="${color}"`), `${id}: preserve the original brand colors`);
  }
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
    for (const localClass of ['root', 'body', 'preference', route === 'index.html' ? 'intro' : 'docs']) {
      const compiled = html.match(new RegExp(`\\b(_${localClass}_[\\w-]+)\\b`))?.[1];
      assert.ok(compiled && css.includes(`.${compiled}`), `${route}: missing ${localClass} styles`);
    }
  }
});

test('theme preferences appear once in the shared header', () => {
  for (const route of ['index.html', 'docs/hello-world/index.html']) {
    const html = readFileSync(join(source, '../pages', route), 'utf8');
    const header = html.match(/<header\b[^]*?<\/header>/)?.[0];
    const footer = html.match(/<footer\b[^]*?<\/footer>/)?.[0];
    assert.ok(header?.includes('data-theme-preference'), `${route}: missing header theme preference`);
    assert.equal([...html.matchAll(/id="theme-preference"/g)].length, 1, `${route}: duplicate theme controls`);
    assert.ok(!footer?.includes('data-theme-preference'), `${route}: theme preference should be in the header`);
  }
});
