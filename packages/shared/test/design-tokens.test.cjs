const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { colors, typography } = require('../dist/design-tokens.js');

function normalizeHex(value) {
  const hex = value.slice(1).toLowerCase();
  return `#${hex.length === 3 ? [...hex].map(char => char + char).join('') : hex}`;
}

test('shared color tokens use colors defined by the site palette', () => {
  const cssPath = path.resolve(__dirname, '../../site/src/app/globals.css');
  const css = fs.readFileSync(cssPath, 'utf8');
  const siteColors = new Set(
    [...css.matchAll(/--[\w-]+:\s*(#[\da-fA-F]{3,8})/g)].map((match) => normalizeHex(match[1])),
  );

  for (const color of Object.values(colors)) {
    assert.ok(siteColors.has(normalizeHex(color)), `${color} is missing from the site palette`);
  }
});

test('shared typography names the fonts bundled by the site', () => {
  assert.match(typography.displayFont, /Manrope/);
  assert.match(typography.bodyFont, /Inter/);
  assert.match(typography.monoFont, /ui-monospace/);
});
