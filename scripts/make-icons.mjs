// Generates every app icon + Play Store graphic from one vector design,
// rendered with CanvasKit (Skia). Re-run after tweaking the design:
//   node scripts/make-icons.mjs
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const CanvasKitInit = require('canvaskit-wasm');
const CK = await CanvasKitInit();
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ----------------------------------------------------------- palette */
const hex = (h, a = 1) => {
  const n = parseInt(h.slice(1), 16);
  return CK.Color4f(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a);
};
const CYAN = '#3DF2FF';

/* ---------------------------------------------------------- helpers */
function paint({ color, style = 'fill', width = 1, blur = 0, blend, shader } = {}) {
  const p = new CK.Paint();
  p.setAntiAlias(true);
  if (color) p.setColor(color);
  if (shader) p.setShader(shader);
  if (style === 'stroke') {
    p.setStyle(CK.PaintStyle.Stroke);
    p.setStrokeWidth(width);
    p.setStrokeCap(CK.StrokeCap.Round);
    p.setStrokeJoin(CK.StrokeJoin.Round);
  }
  if (blur > 0) p.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, blur, false));
  if (blend) p.setBlendMode(blend);
  return p;
}

function save(surface, file, { jpeg = false } = {}) {
  const img = surface.makeImageSnapshot();
  const bytes = jpeg
    ? img.encodeToBytes(CK.ImageFormat.JPEG, 95)
    : img.encodeToBytes(CK.ImageFormat.PNG, 100);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, bytes);
  img.delete();
}

/* ------------------------------------------------------ the artwork */
// Everything is drawn in a unit square (0..1) mapped to `box` = {x, y, s}.

function drawBackground(c, w, h) {
  c.drawRect(CK.XYWHRect(0, 0, w, h), paint({ color: hex('#05061A') }));
  const m = Math.max(w, h);
  // Soft nebula glows
  const glow = (x, y, r, col, a) =>
    c.drawCircle(x, y, r, paint({
      shader: CK.Shader.MakeRadialGradient([x, y], r, [hex(col, a), hex(col, 0)], null, CK.TileMode.Clamp),
    }));
  glow(w * 0.5, h * 0.38, m * 0.62, '#1B2470', 0.95);
  glow(w * 0.18, h * 0.12, m * 0.42, '#0A6F8F', 0.35);
  glow(w * 0.92, h * 0.95, m * 0.55, '#7A1A6E', 0.45);
  // A few stars
  const stars = [[0.16, 0.22, 1], [0.82, 0.18, 0.8], [0.74, 0.42, 0.6], [0.24, 0.84, 0.7], [0.88, 0.66, 0.9], [0.34, 0.12, 0.5], [0.62, 0.9, 0.6]];
  for (const [x, y, a] of stars) {
    c.drawCircle(w * x, h * y, m * 0.006, paint({ color: hex('#CFE0FF', 0.55 * a) }));
  }
}

function drawArt(c, box, { mono = false, beamFrom = -0.25 } = {}) {
  const X = u => box.x + u * box.s;
  const Y = v => box.y + v * box.s;
  const S = d => d * box.s;

  const mirror = [0.5, 0.7];
  const crystal = [0.5, 0.31];
  const beam = new CK.PathBuilder();
  beam.moveTo(X(beamFrom), Y(mirror[1]));
  beam.lineTo(X(mirror[0]), Y(mirror[1]));
  beam.lineTo(X(crystal[0]), Y(crystal[1]));

  const r = 0.2; // crystal radius
  const gem = new CK.PathBuilder();
  gem.moveTo(X(crystal[0]), Y(crystal[1] - r));
  gem.lineTo(X(crystal[0] + r * 0.8), Y(crystal[1] - r * 0.22));
  gem.lineTo(X(crystal[0]), Y(crystal[1] + r));
  gem.lineTo(X(crystal[0] - r * 0.8), Y(crystal[1] - r * 0.22));
  gem.close();

  if (mono) {
    const white = hex('#FFFFFF');
    c.drawPath(beam.snapshot(), paint({ color: white, style: 'stroke', width: S(0.06) }));
    drawMirror(c, X(mirror[0]), Y(mirror[1]), S(0.34), S(0.075), true);
    c.drawPath(gem.snapshot(), paint({ color: white }));
    beam.delete();
    gem.delete();
    return;
  }

  // Beam: wide glow, colour body, white-hot core
  const plus = CK.BlendMode.Plus;
  c.drawPath(beam.snapshot(), paint({ color: hex(CYAN, 0.45), style: 'stroke', width: S(0.13), blur: S(0.045), blend: plus }));
  c.drawPath(beam.snapshot(), paint({ color: hex(CYAN, 0.95), style: 'stroke', width: S(0.05), blur: S(0.008) }));
  c.drawPath(beam.snapshot(), paint({ color: hex('#FFFFFF'), style: 'stroke', width: S(0.018) }));

  drawMirror(c, X(mirror[0]), Y(mirror[1]), S(0.34), S(0.07), false);

  // Crystal halo
  c.drawCircle(X(crystal[0]), Y(crystal[1]), S(0.34), paint({
    shader: CK.Shader.MakeRadialGradient([X(crystal[0]), Y(crystal[1])], S(0.34),
      [hex(CYAN, 0.75), hex(CYAN, 0.18), hex(CYAN, 0)], [0, 0.45, 1], CK.TileMode.Clamp),
    blend: plus,
  }));
  // Gem body
  c.drawPath(gem.snapshot(), paint({
    shader: CK.Shader.MakeLinearGradient([0, Y(crystal[1] - r)], [0, Y(crystal[1] + r)],
      [hex('#FFFFFF'), hex('#9FF8FF'), hex(CYAN)], [0, 0.4, 1], CK.TileMode.Clamp),
  }));
  c.drawPath(gem.snapshot(), paint({ color: hex('#E9FEFF'), style: 'stroke', width: S(0.012) }));
  // Facets
  const f = new CK.PathBuilder();
  const cx = crystal[0], cy = crystal[1];
  f.moveTo(X(cx - r * 0.8), Y(cy - r * 0.22)); f.lineTo(X(cx + r * 0.8), Y(cy - r * 0.22));
  f.moveTo(X(cx - r * 0.32), Y(cy - r * 0.22)); f.lineTo(X(cx), Y(cy + r)); f.lineTo(X(cx + r * 0.32), Y(cy - r * 0.22));
  f.moveTo(X(cx - r * 0.32), Y(cy - r * 0.22)); f.lineTo(X(cx), Y(cy - r)); f.lineTo(X(cx + r * 0.32), Y(cy - r * 0.22));
  c.drawPath(f.snapshot(), paint({ color: hex('#0A6F8F', 0.55), style: 'stroke', width: S(0.008) }));
  f.delete();

  // Four-point sparkle on the crystal's shoulder
  sparkle(c, X(cx + r * 1.05), Y(cy - r * 0.95), S(0.065));
  beam.delete();
  gem.delete();
}

function drawMirror(c, x, y, len, thick, mono) {
  c.save();
  c.translate(x, y);
  c.rotate(-45, 0, 0);
  const rect = CK.RRectXY(CK.XYWHRect(-len / 2, -thick / 2, len, thick), thick / 2, thick / 2);
  if (mono) {
    c.drawRRect(rect, paint({ color: hex('#FFFFFF') }));
  } else {
    c.drawRRect(rect, paint({ color: hex('#BFEFFF', 0.55), blur: thick * 0.6 }));
    c.drawRRect(rect, paint({
      shader: CK.Shader.MakeLinearGradient([0, -thick / 2], [0, thick / 2],
        [hex('#FFFFFF'), hex('#7FA3DA')], null, CK.TileMode.Clamp),
    }));
    const hl = new CK.PathBuilder();
    hl.moveTo(-len / 2 + thick * 0.7, -thick * 0.18);
    hl.lineTo(len / 2 - thick * 0.7, -thick * 0.18);
    c.drawPath(hl.snapshot(), paint({ color: hex('#FFFFFF'), style: 'stroke', width: thick * 0.16 }));
    hl.delete();
  }
  c.restore();
}

function sparkle(c, x, y, size) {
  const p = new CK.PathBuilder();
  const k = size * 0.16;
  p.moveTo(x, y - size); p.quadTo(x + k, y - k, x + size, y);
  p.quadTo(x + k, y + k, x, y + size); p.quadTo(x - k, y + k, x - size, y);
  p.quadTo(x - k, y - k, x, y - size); p.close();
  c.drawPath(p.snapshot(), paint({ color: hex('#FFFFFF', 0.95) }));
  c.drawCircle(x, y, size * 0.5, paint({ color: hex('#FFFFFF', 0.5), blur: size * 0.3 }));
  p.delete();
}

/* ---------------------------------------------------------- renderers */

/** Full-bleed square icon (Play Store, iOS, legacy launcher before masking). */
function renderSquare(size, { shape = 'square' } = {}) {
  const surface = CK.MakeSurface(size, size);
  const c = surface.getCanvas();
  c.clear(CK.TRANSPARENT);
  if (shape !== 'square') {
    const clip = new CK.PathBuilder();
    if (shape === 'circle') clip.addCircle(size / 2, size / 2, size / 2);
    else clip.addRRect(CK.RRectXY(CK.XYWHRect(0, 0, size, size), size * 0.22, size * 0.22));
    c.clipPath(clip.snapshot(), CK.ClipOp.Intersect, true);
    clip.delete();
  }
  drawBackground(c, size, size);
  // Art fills ~84% of the square
  drawArt(c, { x: size * 0.08, y: size * 0.08, s: size * 0.84 });
  return surface;
}

/** Adaptive icon layers: 108dp canvas, art kept inside the 66dp safe zone. */
function renderAdaptive(size, layer) {
  const surface = CK.MakeSurface(size, size);
  const c = surface.getCanvas();
  c.clear(CK.TRANSPARENT);
  const art = { x: size * (21 / 108), y: size * (21 / 108), s: size * (66 / 108) };
  if (layer === 'background') drawBackground(c, size, size);
  else drawArt(c, art, { mono: layer === 'monochrome' });
  return surface;
}

/** Play Store feature graphic, 1024 x 500. */
function renderFeature() {
  const W = 1024, H = 500;
  const surface = CK.MakeSurface(W, H);
  const c = surface.getCanvas();
  drawBackground(c, W, H);
  drawArt(c, { x: 610, y: 40, s: 420 }, { beamFrom: -1.6 });

  const fontPath = ['C:/Windows/Fonts/seguibl.ttf', 'C:/Windows/Fonts/ariblk.ttf'].find(existsSync);
  const face = CK.Typeface.MakeTypefaceFromData(readFileSync(fontPath).buffer);
  const spaced = (text, x, y, size, tracking, color) => {
    const font = new CK.Font(face, size);
    const widths = font.getGlyphWidths(font.getGlyphIDs(text));
    let cx = x;
    [...text].forEach((ch, i) => {
      c.drawText(ch, cx, y, paint({ color: typeof color === 'function' ? color(i) : color }), font);
      cx += widths[i] + tracking;
    });
    font.delete();
  };
  // Title with glow
  const title = 'LIGHTSIT';
  const col = i => (i >= 6 ? hex('#5FF4FF') : hex('#EEF1FF'));
  c.saveLayer(paint({ blur: 0 }));
  spaced(title, 70, 250, 104, 10, i => hex(i >= 6 ? CYAN : '#7FB8FF', 0.55));
  c.restore();
  // blur pass then crisp pass
  const blurLayer = paint({});
  blurLayer.setImageFilter(CK.ImageFilter.MakeBlur(14, 14, CK.TileMode.Decal, null));
  c.saveLayer(blurLayer);
  spaced(title, 70, 250, 104, 10, i => hex(i >= 6 ? CYAN : '#6FA8FF', 0.8));
  c.restore();
  spaced(title, 70, 250, 104, 10, col);
  spaced('BEND LIGHT  ·  WAKE THE CRYSTALS', 74, 312, 25, 4.5, hex('#9AA4D6'));
  return surface;
}

/* -------------------------------------------------------------- output */
const res = join(ROOT, 'android/app/src/main/res');
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

for (const [d, k] of Object.entries(densities)) {
  const legacy = Math.round(48 * k);
  const layer = Math.round(108 * k);
  save(renderSquare(legacy, { shape: 'rounded' }), join(res, `mipmap-${d}/ic_launcher.png`));
  save(renderSquare(legacy, { shape: 'circle' }), join(res, `mipmap-${d}/ic_launcher_round.png`));
  for (const l of ['background', 'foreground', 'monochrome']) {
    save(renderAdaptive(layer, l), join(res, `mipmap-${d}/ic_launcher_${l}.png`));
  }
}

const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />
</adaptive-icon>
`;
mkdirSync(join(res, 'mipmap-anydpi-v26'), { recursive: true });
writeFileSync(join(res, 'mipmap-anydpi-v26/ic_launcher.xml'), adaptiveXml);
writeFileSync(join(res, 'mipmap-anydpi-v26/ic_launcher_round.xml'), adaptiveXml);

// iOS: single 1024 universal icon (Xcode 14+ generates the rest), no alpha.
const iosDir = join(ROOT, 'ios/lightsIt/Images.xcassets/AppIcon.appiconset');
if (existsSync(iosDir)) {
  save(renderSquare(1024), join(iosDir, 'AppIcon-1024.png'));
  writeFileSync(join(iosDir, 'Contents.json'), JSON.stringify({
    images: [{ filename: 'AppIcon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }],
    info: { author: 'xcode', version: 1 },
  }, null, 2) + '\n');
}

// Play Store listing assets
const store = join(ROOT, 'store-assets');
save(renderSquare(512), join(store, 'play-icon-512.png'));
save(renderSquare(1024), join(store, 'icon-1024.png'));
save(renderFeature(), join(store, 'feature-graphic-1024x500.png'));

console.log('Icons written to android/app/src/main/res, ios AppIcon, and store-assets/');
