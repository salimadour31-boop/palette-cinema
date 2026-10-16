// Run: node test/palette.test.js
const assert = require('assert'); const P = require('../js/palette.js');
const data = []; // 3 pure colours, 100 px each
[[255,0,0],[0,255,0],[0,0,255]].forEach(c => { for (let i = 0; i < 100; i++) data.push(...c, 255); });
const pal = P.kmeans(P.samplePixels(new Uint8ClampedArray(data)), 3);
assert.deepStrictEqual(pal.map(c => c.hex).sort(), ['#0000ff', '#00ff00', '#ff0000']);
for (const k of [5,6,7,8]) assert.strictEqual(P.kmeans(P.samplePixels(new Uint8ClampedArray(data)), k).length, k);
P.PRESETS.forEach(n => { const p = P.preset(n, 8); assert.strictEqual(p.length, 8); p.forEach(c => assert.match(c.hex, /^#[0-9a-f]{6}$/)); });
assert.ok(P.toCSS(pal).includes('--cine-1')); assert.strictEqual(JSON.parse(P.toJSON(pal)).colors.length, 3);
assert.ok(P.toTXT(pal).split('\n').length >= 4);
console.log('All tests passed');
