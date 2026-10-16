/* UI wiring: file loading, video frame capture, extraction, presets, exports, i18n. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const P = window.Palette;
  let lang = localStorage.getItem('pc-lang') || 'fr';
  let palette = P.preset('tealOrange', 6);
  const t = key => (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;

  /** Apply current language to all [data-i18n] nodes. */
  function applyLang() {
    document.documentElement.lang = lang === 'kab' ? 'kab' : lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $('lang').value = lang; renderPresets();
  }

  function toast(msg) { const el = $('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('show'), 1400); }

  /** Draw the palette as clickable swatches. */
  function render() {
    const box = $('swatches'); box.innerHTML = '';
    palette.forEach(c => {
      const b = document.createElement('button'); b.className = 'sw'; b.style.background = c.hex;
      b.style.color = (0.2126 * c.rgb[0] + 0.7152 * c.rgb[1] + 0.0722 * c.rgb[2]) > 140 ? '#111' : '#fff';
      b.innerHTML = `<strong>${c.hex.toUpperCase()}</strong><span>${c.rgb.join(', ')}</span>`;
      b.title = c.hex;
      b.onclick = () => copy(c.hex.toUpperCase());
      box.appendChild(b);
    });
  }

  function copy(text) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .catch(() => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); })
      .finally(() => toast(t('copied') + ' ' + text));
  }

  function renderPresets() {
    const box = $('presets'); box.innerHTML = '';
    P.PRESETS.forEach(name => {
      const pal = P.preset(name, 6), b = document.createElement('button');
      b.innerHTML = `<span>${t(name)}</span><span class="mini">${pal.map(c => `<i style="background:${c.hex}"></i>`).join('')}</span>`;
      b.onclick = () => { palette = P.preset(name, +$('k').value); render(); };
      box.appendChild(b);
    });
  }

  /* ---------- Loading sources ---------- */
  const cv = $('preview'), ctx = cv.getContext('2d', { willReadFrequently: true });
  function drawToCanvas(src, w, h) {
    const s = Math.min(1, 800 / Math.max(w, h)); cv.width = Math.round(w * s); cv.height = Math.round(h * s);
    ctx.drawImage(src, 0, 0, cv.width, cv.height); cv.hidden = false; $('extract').disabled = false; extract();
  }
  function load(file) {
    if (!file) return; const url = URL.createObjectURL(file);
    if (file.type.startsWith('image/')) {
      $('videoBox').hidden = true; const img = new Image();
      img.onload = () => drawToCanvas(img, img.naturalWidth, img.naturalHeight); img.src = url;
    } else if (file.type.startsWith('video/')) {
      $('videoBox').hidden = false; cv.hidden = true; $('video').src = url;
    } else toast(t('badfile'));
  }
  $('file').onchange = e => load(e.target.files[0]);
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => load(e.dataTransfer.files[0]));
  $('grab').onclick = () => { const v = $('video'); if (v.videoWidth) drawToCanvas(v, v.videoWidth, v.videoHeight); };

  /** Run k-means on the current canvas. */
  function extract() {
    const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
    palette = P.kmeans(P.samplePixels(data), +$('k').value); render();
  }
  $('extract').onclick = extract;
  $('k').oninput = e => { $('kOut').textContent = e.target.value; };
  $('k').onchange = () => { if (!$('extract').disabled) extract(); };

  /* ---------- Exports ---------- */
  function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
  function exportPNG() {
    const c = document.createElement('canvas'), w = 160, x = c.getContext('2d');
    c.width = w * palette.length; c.height = 220;
    palette.forEach((col, i) => {
      x.fillStyle = col.hex; x.fillRect(i * w, 0, w, 170);
      x.fillStyle = '#121214'; x.fillRect(i * w, 170, w, 50);
      x.fillStyle = '#ecebe6'; x.font = '16px monospace'; x.fillText(col.hex.toUpperCase(), i * w + 12, 200);
    });
    c.toBlob(b => download('palette-cinema.png', b));
  }
  document.querySelectorAll('[data-export]').forEach(b => b.onclick = () => {
    const f = b.dataset.export;
    if (f === 'png') return exportPNG();
    const map = { css: [P.toCSS, 'text/css'], json: [P.toJSON, 'application/json'], txt: [P.toTXT, 'text/plain'] };
    download('palette-cinema.' + f, new Blob([map[f][0](palette)], { type: map[f][1] }));
  });

  $('lang').onchange = e => { lang = e.target.value; localStorage.setItem('pc-lang', lang); applyLang(); };
  applyLang(); render();
})();
