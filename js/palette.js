/* Core color logic — pure functions, usable in browser and Node (for tests). */
(function (root) {
  'use strict';
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = ([r, g, b]) => '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');

  /** Deterministic PRNG (mulberry32) so results are reproducible. */
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /**
   * Sample pixels from RGBA data (skipping transparent ones), max ~maxSamples points.
   */
  function samplePixels(data, maxSamples = 12000) {
    const total = data.length / 4, step = Math.max(1, Math.floor(total / maxSamples)), pts = [];
    for (let i = 0; i < total; i += step) {
      const o = i * 4;
      if (data[o + 3] < 128) continue;
      pts.push([data[o], data[o + 1], data[o + 2]]);
    }
    return pts;
  }

  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

  /**
   * k-means with k-means++ seeding. Returns clusters sorted by luminance:
   * [{rgb:[r,g,b], hex, share}]
   */
  function kmeans(points, k, iters = 20, seed = 42) {
    if (!points.length) return [];
    const rand = rng(seed);
    // k-means++ init
    const cents = [points[Math.floor(rand() * points.length)].slice()];
    while (cents.length < k) {
      const dist = points.map(p => Math.min(...cents.map(c => d2(p, c))));
      const sum = dist.reduce((a, b) => a + b, 0);
      if (sum === 0) { cents.push(cents[0].slice()); continue; }
      let r = rand() * sum, i = 0;
      while ((r -= dist[i]) > 0 && i < points.length - 1) i++;
      cents.push(points[i].slice());
    }
    const assign = new Array(points.length).fill(0);
    for (let it = 0; it < iters; it++) {
      let moved = false;
      points.forEach((p, i) => {
        let best = 0, bd = Infinity;
        cents.forEach((c, j) => { const d = d2(p, c); if (d < bd) { bd = d; best = j; } });
        if (assign[i] !== best) { assign[i] = best; moved = true; }
      });
      const acc = cents.map(() => [0, 0, 0, 0]);
      points.forEach((p, i) => { const a = acc[assign[i]]; a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3]++; });
      acc.forEach((a, j) => { if (a[3]) cents[j] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
      if (!moved && it > 0) break;
    }
    const counts = cents.map(() => 0); assign.forEach(a => counts[a]++);
    return cents.map((c, j) => ({ rgb: c.map(clamp), hex: toHex(c), share: counts[j] / points.length }))
      .sort((a, b) => lum(a.rgb) - lum(b.rgb));
  }

  const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

  /** HSL (h 0-360, s/l 0-1) -> RGB */
  function hsl(h, s, l) {
    const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
      return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
    return [f(0), f(8), f(4)].map(clamp);
  }

  /**
   * Original film-look presets. Each generator returns n colors (dark -> light)
   * by interpolating along hand-designed hue/sat/light ramps.
   */
  const PRESETS = {
    tealOrange: t => (t < .5 ? [190, .55, .08 + t * .7] : [28, .75, .2 + t * .6]),
    noir:       t => [220, .06, .04 + t * .9],
    goldenHour: t => [15 + t * 35, .7 - t * .2, .12 + t * .72],
    bleachBypass: t => [200 - t * 160, .12, .1 + t * .78],
    neonNight:  t => [[280, 320, 200, 170, 300, 260, 190, 330][Math.round(t * 7)], .8, .12 + t * .5],
    desertWestern: t => [30 + t * 15, .45 + t * .15, .12 + t * .7]
  };
  function preset(name, n = 6) {
    const g = PRESETS[name];
    return Array.from({ length: n }, (_, i) => {
      const [h, s, l] = g(n === 1 ? 0 : i / (n - 1)); const rgb = hsl(h, s, l);
      return { rgb, hex: toHex(rgb), share: 1 / n };
    });
  }

  /* ---------- Export formatters ---------- */
  const toCSS = p => ':root {\n' + p.map((c, i) => `  --cine-${i + 1}: ${c.hex};`).join('\n') + '\n}\n';
  const toJSON = p => JSON.stringify({ name: 'palette-cinema', colors: p.map(c => ({ hex: c.hex, rgb: c.rgb, share: +c.share.toFixed(4) })) }, null, 2);
  const toTXT = p => 'Palette Cinema\n' + p.map((c, i) => `${i + 1}\t${c.hex}\trgb(${c.rgb.join(', ')})`).join('\n') + '\n';

  root.Palette = { samplePixels, kmeans, preset, PRESETS: Object.keys(PRESETS), toHex, hsl, toCSS, toJSON, toTXT };
  if (typeof module !== 'undefined') module.exports = root.Palette;
})(typeof window !== 'undefined' ? window : globalThis);
