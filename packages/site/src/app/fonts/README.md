# Local site fonts

These files replace the network-dependent `next/font/google` build step only.
The families, normal style, discrete weights (Manrope 500/600/700/800 and Inter
400/500/600), `swap`, preloading, CSS variables and adjusted Arial fallback
metrics match the previous configuration. Tailwind's subsequent family fallback
lists are unchanged. No italic face was requested before or is added here.

## Sources and license

Both fonts are licensed under SIL Open Font License 1.1, compatible with bundling
and web embedding. Keep the accompanying copyright notices and full licenses. License text is
unchanged except trailing-space cleanup.
The repository's MIT license does not replace the font licenses.

- Inter: version `4.001;git-66647c0bb`, copyright 2020 The Inter Project Authors.
  Source: https://raw.githubusercontent.com/google/fonts/0b58fb370093f9a9f4ff785d94405710b79de67c/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf
  License: https://raw.githubusercontent.com/google/fonts/0b58fb370093f9a9f4ff785d94405710b79de67c/ofl/inter/OFL.txt
  Upstream: https://github.com/rsms/inter
- Manrope: version `4.504`, copyright 2018 The Manrope Project Authors.
  Source: https://raw.githubusercontent.com/google/fonts/8f9a401dbb3793e0d1264b15d96aa253f05280f5/ofl/manrope/Manrope%5Bwght%5D.ttf
  License: https://raw.githubusercontent.com/google/fonts/8f9a401dbb3793e0d1264b15d96aa253f05280f5/ofl/manrope/OFL.txt
  Upstream: https://github.com/googlefonts/manrope

The versions were read from the actual production WOFF2 files on 2026-10-26.
Manrope 4.505 was deliberately not selected. Inter's optical size axis is pinned
to 14, matching the production Google Fonts weight-only face. Weight variation
is retained. FontTools 4.65.0 converted the pinned TTF sources to WOFF2 with
Brotli 1.2.1; no glyph outlines were edited or renamed. The full glyph sets are
bundled in one file per family rather than downloading per-script subsets.

The old `subsets: ['latin']` selected preloads, not exclusive glyph coverage:
Google also emitted other script faces. `unicode-range` declarations preserve
the union of those production ranges. This matters for symbols outside those
ranges: they must continue to fall back rather than picking a newly available
glyph from the full local font. `fallbacks.css` preserves production's adjusted
Arial metrics rather than accepting newly calculated local-loader metrics.

## Reproduce assets (outside the application dependency tree)

With Python FontTools and Brotli installed in a separate tooling environment:

```python
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

inter = TTFont('Inter[opsz,wght].ttf')
inter = instantiateVariableFont(inter, {'opsz': 14}, inplace=True)
inter.flavor = 'woff2'
inter.save('Inter-normal.woff2')
manrope = TTFont('Manrope[wght].ttf')
manrope.flavor = 'woff2'
manrope.save('Manrope-normal.woff2')
```

Font tools are not runtime or repository dependencies. Build reads the checked-in
WOFF2 files and does not regenerate them.

## Asset checksums (SHA-256)

- `Inter-normal.woff2`: `f546f8c0c59c40a573c4592bb9fde76e0a820ef96cca7f855517a847a288c33a`
- `Manrope-normal.woff2`: `521813ebc3ecbe6256e404702268ed1dd2eeb5ca54cd5e3dae35dab279cd29ff`

Tradeoff: preloading complete font files is about 290 KB before transport
compression, larger than the previous Latin-only preloads. It avoids a font
version change and keeps the prior multi-script coverage. This is not a
performance improvement claim.
