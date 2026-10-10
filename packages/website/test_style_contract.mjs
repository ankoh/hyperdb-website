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

test('cards and panels share the global card border token', () => {
  const palette = readFileSync(join(source, 'layouts/theme.module.css'), 'utf8');
  assert.match(palette, /--card-border:\s*light-dark\(/);
  for (const path of ['pages/index.module.css', 'pages/docs/docs.module.css', 'components/federation_animation.module.css', 'components/sql_example.module.css', 'islands/try_sql.module.css']) {
    assert.match(readFileSync(join(source, path), 'utf8'), /border:\s*1px solid var\(--card-border\)/, `${path}: use the shared card border`);
  }
  for (const file of files.filter(file => file.endsWith('.css'))) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /--(?:surface-border|federation-tile-border)\b/, 'obsolete card border tokens');
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
  for (const route of ['index.html', 'docs/hello-world/index.html', 'experiments/index.html']) {
    const html = readFileSync(join(pages, route), 'utf8');
    const links = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)];
    assert.ok(links.length > 0, `${route}: missing stylesheet links`);
    const css = links.map((match) => readFileSync(join(pages, match[1]), 'utf8')).join('\n');
    assert.ok(css.trim().length > 0, `${route}: empty stylesheets`);
  }
});

test('page headers offer an accessible theme toggle instead of a dropdown', () => {
  for (const route of ['index.html', 'docs/hello-world/index.html', 'experiments/index.html']) {
    const html = readFileSync(join(source, '../pages', route), 'utf8');
    const header = html.match(/<header\b[^]*?<\/header>/)?.[0];
    assert.ok(header, `${route}: missing header`);
    const toggle = header.match(/<button\b[^>]*data-theme-preference[^>]*>[^]*?<\/button>/)?.[0];
    assert.ok(toggle, `${route}: missing theme toggle`);
    assert.match(toggle, /type="button"/);
    assert.match(toggle, /aria-label="Dark theme"/);
    assert.match(toggle, /aria-pressed="false"/);
    assert.equal([...toggle.matchAll(/<svg\b[^>]*aria-hidden="true"[^>]*>/g)].length, 2);
    assert.doesNotMatch(header, /<select\b/);
  }
});

test('experiments are unlisted and ship a compact, accessible federation graphic', () => {
  const pages = join(source, '../pages');
  const html = readFileSync(join(pages, 'experiments/index.html'), 'utf8');
  assert.match(html, /<meta\b[^>]*name="robots"[^>]*content="noindex, nofollow"/);
  assert.match(html, /data-federation-animation\b/);
  assert.match(html, /<svg\b[^>]*role="img"[^>]*aria-label="[^"]+"/);
  assert.doesNotMatch(html, /data-playback|data-replay|data-motion-note|<ol\b|Federation sequence/);
  assert.match(html, /viewBox="0 0 430 246"/);
  assert.ok(html.includes('#hyper_monochrome'));
  assert.equal([...html.matchAll(/<circle\b[^>]*r="3"/g)].length, 8, 'transfers use eight traveling dots');
  assert.doesNotMatch(html, /SELECT SUM\(sales\)/);
  for (const line of ['select * from', 'salesforce_table,', 'snowflake_table,', 'databricks_table', 'where', '...']) {
    assert.ok(html.includes(`>${line}</tspan>`), `missing SQL line: ${line}`);
  }
  for (const table of ['salesforce_table,', 'snowflake_table,', 'databricks_table']) {
    assert.match(html, new RegExp(`<tspan x="78"[^>]*>${table}</tspan>`), 'table names are indented');
  }
  assert.match(html, /<tspan dx="10">\.\.\.<\/tspan>/, 'three dots are offset from where');
  for (const label of ['SQL subquery', 'Read Iceberg', 'Data', 'Results']) {
    assert.ok(html.includes(`>${label}</text>`), `missing transfer label: ${label}`);
  }
  const sourceLabels = [...html.matchAll(/<text x="376" y="(\d+)"[^>]*>([^<]+)<\/text>/g)].map((match) => [Number(match[1]), match[2]]);
  assert.deepEqual(sourceLabels, [[82, 'Salesforce'], [162, 'Snowflake'], [242, 'Databricks']]);
  for (const name of ['User', 'Hyper', 'Snowflake', 'Databricks', 'Salesforce']) {
    assert.ok(html.includes(`>${name}</text>`), `missing node label: ${name}`);
  }
  const hyperAsset = html.match(/href="([^"]*\/hyper\.[^"]+\.svg)#hyper"/);
  assert.ok(hyperAsset, 'should reference the original Hyper logo symbol');
  assert.ok(readFileSync(join(pages, hyperAsset[1]), 'utf8').includes('<symbol id="hyper"'));
  const mono = readFileSync(join(source, 'assets/hyper_monochrome.svg'), 'utf8');
  assert.match(mono, /fill="currentColor"/);
  assert.doesNotMatch(mono, /#[\da-f]{3,8}\b/i);
  const originalPaths = [...readFileSync(join(source, 'assets/hyper.svg'), 'utf8').matchAll(/\bd="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual([...mono.matchAll(/\bd="([^"]+)"/g)].map((match) => match[1]), originalPaths, 'monochrome keeps original artwork');
  const iceberg = readFileSync(join(source, 'assets/iceberg.svg'), 'utf8');
  const icebergMono = readFileSync(join(source, 'assets/iceberg_monochrome.svg'), 'utf8');
  assert.match(iceberg, /viewBox="0 0 200 200"/);
  assert.match(icebergMono, /fill="currentColor"/);
  assert.doesNotMatch(icebergMono, /#[\da-f]{3,8}\b/i);
  assert.equal(icebergMono.match(/transform="([^"]+)"/)[1], iceberg.match(/transform="([^"]+)"/)[1]);
  assert.deepEqual([...icebergMono.matchAll(/\bd="([^"]+)"/g)].map((match) => match[1]), [...iceberg.matchAll(/\bd="([^"]+)"/g)].map((match) => match[1]), 'monochrome keeps Iceberg geometry');
  assert.ok(html.includes('#salesforce_cloud"') && html.includes('#salesforce_cloud_monochrome"'), 'both Salesforce cloud variants are available');
  assert.doesNotMatch(html, /#iceberg|Read request<\/text>/);
  const cloud = readFileSync(join(source, 'assets/salesforce_cloud.svg'), 'utf8');
  const cloudMono = readFileSync(join(source, 'assets/salesforce_cloud_monochrome.svg'), 'utf8');
  const cloudPath = cloud.match(/\bd="([^"]+)"/)[1];
  assert.equal(cloudPath, readFileSync(join(source, 'assets/salesforce.svg'), 'utf8').match(/\bd="([^"]+)"/)[1]);
  assert.equal(cloudMono.match(/\bd="([^"]+)"/)[1], cloudPath);
  for (const svg of [cloud, cloudMono]) {
    assert.equal([...svg.matchAll(/<path\b/g)].length, 1, 'cloud contains no lettering paths');
    assert.doesNotMatch(svg, /<text\b|<mask\b/);
  }
  assert.match(cloudMono, /fill="currentColor"/);
  for (const route of ['index.html', 'docs/hello-world/index.html']) {
    assert.doesNotMatch(readFileSync(join(pages, route), 'utf8'), /href="\/experiments(?:\/|#|")/);
  }
});

test('the landing page embeds the accessible federation animation', () => {
  const html = readFileSync(join(source, '../pages/index.html'), 'utf8');
  assert.equal([...html.matchAll(/data-federation-animation\b/g)].length, 1);
  const section = html.match(/<section\b[^>]*id="qualities"[^]*?<\/section>/)?.[0];
  assert.ok(section, 'missing feature section');
  assert.match(section, /data-federation-animation\b/);
  assert.match(section, /<svg\b[^>]*role="img"[^>]*aria-label="[^"]+"/);
  assert.doesNotMatch(section, /aria-hidden="true"[^>]*>\s*<div[^>]*data-federation-animation/);
});
