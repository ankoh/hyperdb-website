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

test('authored styles live in CSS Modules and the shared palette', () => {
  for (const file of files) {
    const path = relative(source, file);
    if (!/\.(css|astro|tsx?|mdx)$/.test(file)) continue;
    const content = readFileSync(file, 'utf8');
    if (file.endsWith('.css')) {
      assert.ok(file.endsWith('.module.css'), `${path}: use CSS Modules`);
      if (path !== 'layouts/Theme.module.css') {
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

test('generated syntax highlighting uses the shared palette', () => {
  const html = readFileSync(join(source, '../pages/docs/hello-world/index.html'), 'utf8');
  const code = html.match(/<pre\b[^>]*class="astro-code[^]*?<\/pre>/)?.[0];
  assert.ok(code, 'The SQL example should exercise Astro syntax highlighting');
  const palette = readFileSync(join(source, 'layouts/Theme.module.css'), 'utf8');
  const variables = [...code.matchAll(/var\((--[\w-]+)\)/g)].map((match) => match[1]);
  assert.ok(variables.length > 0, 'Generated styles must reference CSS variables');
  for (const variable of new Set(variables)) {
    assert.ok(palette.includes(`${variable}:`), `${variable}: missing shared token`);
  }
  assert.doesNotMatch(code, /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i, 'Do not embed a fixed highlighter palette');
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
