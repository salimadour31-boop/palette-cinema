// Palette Cinéma - Client-side color extractor and generator
// No external dependencies. All processing local.

const translations = {
  fr: {
    title: "Palette Cinéma",
    upload: "Choisir une image ou une vidéo",
    capture: "Capturer le cadre",
    palette: "Palette extraite",
    copyCss: "Copier CSS",
    download: "Télécharger PNG",
    info: "Outil gratuit dans le navigateur. Aucune donnée n'est envoyée."
  },
  en: {
    title: "Cinema Palette",
    upload: "Choose image or video",
    capture: "Capture frame",
    palette: "Extracted palette",
    copyCss: "Copy CSS",
    download: "Download PNG",
    info: "Free browser tool. No data is sent."
  },
  tzm: {
    title: "Palette Cinema",
    upload: "Fren aswir neɣ tvidyu",
    capture: "Aṭṭaf anaqes",
    palette: "Palette yettwafeg",
    copyCss: "Nɣel CSS",
    download: "Sider PNG",
    info: "Aḥil n uɣawas deg uminig. Ulac isefka yettwaznen."
  }
};

let currentLang = "fr";
let colors = [];

function setLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang === "tzm" ? "ber" : lang;
  const t = translations[lang];
  document.getElementById("title").textContent = t.title;
  document.getElementById("upload-label").textContent = t.upload;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (t[key]) el.textContent = t[key];
  });
}

document.getElementById("lang-select").addEventListener("change", (e) => setLanguage(e.target.value));

const fileInput = document.getElementById("file-input");
const video = document.getElementById("video-preview");
const canvas = document.getElementById("canvas");
const captureBtn = document.getElementById("capture-btn");
const paletteSection = document.getElementById("palette-section");
const swatchesDiv = document.getElementById("swatches");

fileInput.addEventListener("change", handleFile);

function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  if (file.type.startsWith("image/")) {
    const img = new Image();
    img.onload = () => extractFromImage(img);
    img.src = url;
    video.style.display = "none";
    captureBtn.style.display = "none";
  } else if (file.type.startsWith("video/")) {
    video.src = url;
    video.style.display = "block";
    captureBtn.style.display = "inline-block";
    video.onloadeddata = () => {
      // Optional: auto-capture first frame
    };
  }
}

captureBtn.addEventListener("click", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);
  extractFromCanvas(canvas);
});

function extractFromImage(img) {
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  extractFromCanvas(canvas);
}

function extractFromCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  colors = extractDominantColors(data, 5);
  displayPalette(colors);
  paletteSection.style.display = "block";
}

// Simple color extraction: sample and quantize to most frequent buckets
function extractDominantColors(data, n) {
  const buckets = {};
  const step = 4 * 10; // sample every 10 pixels
  for (let i = 0; i < data.length; i += step) {
    const r = data[i], g = data[i+1], b = data[i+2];
    // Skip near black/white for cinematic focus
    if (r + g + b < 30 || r + g + b > 720) continue;
    const key = `${Math.floor(r/16)*16},${Math.floor(g/16)*16},${Math.floor(b/16)*16}`;
    buckets[key] = (buckets[key] || 0) + 1;
  }
  const sorted = Object.entries(buckets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k.split(",").map(Number));
  return sorted.map(([r, g, b]) => rgbToHex(r, g, b));
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
}

function displayPalette(cols) {
  swatchesDiv.innerHTML = "";
  cols.forEach((hex, i) => {
    const div = document.createElement("div");
    div.className = "swatch";
    div.style.background = hex;
    div.innerHTML = `<span>${hex}</span>`;
    div.title = hex;
    div.addEventListener("click", () => {
      navigator.clipboard.writeText(hex);
      alert(hex + " copié");
    });
    swatchesDiv.appendChild(div);
  });
}

// Mood generators - original simple transformations
document.querySelectorAll(".mood-btn").forEach(btn => {
  btn.addEventListener("click", () => applyMood(btn.dataset.mood));
});

function applyMood(mood) {
  if (!colors.length) return;
  let newColors = [...colors];
  if (mood === "teal-orange") {
    newColors = colors.map((hex, i) => i % 2 === 0 ? shiftHue(hex, 180) : hex);
  } else if (mood === "noir") {
    newColors = colors.map(hex => desaturate(hex, 0.8));
  } else if (mood === "pastel") {
    newColors = colors.map(hex => lighten(hex, 0.4));
  } else if (mood === "complementary") {
    newColors = colors.map(hex => shiftHue(hex, 180));
  }
  displayPalette(newColors);
  colors = newColors; // update for export
}

function hexToRgb(hex) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0,0,0];
}

function shiftHue(hex, degrees) {
  let [r, g, b] = hexToRgb(hex);
  // Simple approximation: rotate in RGB roughly
  const rad = degrees * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const nr = Math.max(0, Math.min(255, r * cos - g * sin));
  const ng = Math.max(0, Math.min(255, r * sin + g * cos));
  return rgbToHex(Math.round(nr), Math.round(ng), b);
}

function desaturate(hex, amount) {
  let [r, g, b] = hexToRgb(hex);
  const gray = 0.3 * r + 0.59 * g + 0.11 * b;
  r = gray + (r - gray) * (1 - amount);
  g = gray + (g - gray) * (1 - amount);
  b = gray + (b - gray) * (1 - amount);
  return rgbToHex(Math.round(r), Math.round(g), Math.round(b));
}

function lighten(hex, amount) {
  let [r, g, b] = hexToRgb(hex);
  r = Math.min(255, r + (255 - r) * amount);
  g = Math.min(255, g + (255 - g) * amount);
  b = Math.min(255, b + (255 - b) * amount);
  return rgbToHex(Math.round(r), Math.round(g), Math.round(b));
}

// Export
document.getElementById("copy-css").addEventListener("click", () => {
  const css = colors.map((c, i) => `--c${i}: ${c};`).join("\n");
  navigator.clipboard.writeText(css);
  alert("CSS copié");
});

document.getElementById("download-png").addEventListener("click", () => {
  const c = document.createElement("canvas");
  c.width = colors.length * 100;
  c.height = 100;
  const ctx = c.getContext("2d");
  colors.forEach((hex, i) => {
    ctx.fillStyle = hex;
    ctx.fillRect(i * 100, 0, 100, 100);
  });
  const a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = "palette-cinema.png";
  a.click();
});

// Init
setLanguage("fr");