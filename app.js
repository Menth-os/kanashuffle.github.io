const GRID_SIZE = 50;

// ---------- i18n loader ----------
const I18N_CACHE = new Map();
let I18N = {};
let I18N_EN = {};

async function loadI18nFile(lang) {
  if (I18N_CACHE.has(lang)) return I18N_CACHE.get(lang);
  const res = await fetch(`./i18n/${lang}.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Missing i18n file: ${lang}.json`);
  const data = await res.json();
  I18N_CACHE.set(lang, data);
  return data;
}

async function setLanguage(lang) {
  // always ensure EN exists
  if (!Object.keys(I18N_EN).length) {
    try { I18N_EN = await loadI18nFile("en"); }
    catch { I18N_EN = {}; }
  }

  let normalized = (lang === "de" || lang === "ja") ? lang : "en";

  try {
    I18N = await loadI18nFile(normalized);
  } catch {
    I18N = I18N_EN;
    normalized = "en";
  }

  state.lang = normalized;
}

function t(key) {
  return (I18N && I18N[key]) || (I18N_EN && I18N_EN[key]) || key;
}

// ---------- State ----------
let state = {
  lang: "en",
  type: "hiragana",
  dakuten: false,
  font: "system-ui",
  rows: [],
  seed: "",
  romaji: false,
  dark: false
};

// ---------- Data ----------
const BASE = {
  hiragana: {
    kana: [
      "あ","い","う","え","お",
      "か","き","く","け","こ",
      "さ","し","す","せ","そ",
      "た","ち","つ","て","と",
      "な","に","ぬ","ね","の",
      "は","ひ","ふ","へ","ほ",
      "ま","み","む","め","も",
      "や","ゆ","よ",
      "ら","り","る","れ","ろ",
      "わ","を","ん"
    ],
    romaji: [
      "a","i","u","e","o",
      "ka","ki","ku","ke","ko",
      "sa","shi","su","se","so",
      "ta","chi","tsu","te","to",
      "na","ni","nu","ne","no",
      "ha","hi","fu","he","ho",
      "ma","mi","mu","me","mo",
      "ya","yu","yo",
      "ra","ri","ru","re","ro",
      "wa","wo","n"
    ]
  },
  katakana: {
    kana: [
      "ア","イ","ウ","エ","オ",
      "カ","キ","ク","ケ","コ",
      "サ","シ","ス","セ","ソ",
      "タ","チ","ツ","テ","ト",
      "ナ","ニ","ヌ","ネ","ノ",
      "ハ","ヒ","フ","ヘ","ホ",
      "マ","ミ","ム","メ","モ",
      "ヤ","ユ","ヨ",
      "ラ","リ","ル","レ","ロ",
      "ワ","ヲ","ン"
    ],
    romaji: [
      "a","i","u","e","o",
      "ka","ki","ku","ke","ko",
      "sa","shi","su","se","so",
      "ta","chi","tsu","te","to",
      "na","ni","nu","ne","no",
      "ha","hi","fu","he","ho",
      "ma","mi","mu","me","mo",
      "ya","yu","yo",
      "ra","ri","ru","re","ro",
      "wa","wo","n"
    ]
  }
};

const MAPS = {
  dakuten: {
    "か":"が","き":"ぎ","く":"ぐ","け":"げ","こ":"ご",
    "さ":"ざ","し":"じ","す":"ず","せ":"ぜ","そ":"ぞ",
    "た":"だ","ち":"ぢ","つ":"づ","て":"で","と":"ど",
    "は":"ば","ひ":"び","ふ":"ぶ","へ":"べ","ほ":"ぼ",
    "カ":"ガ","キ":"ギ","ク":"グ","ケ":"ゲ","コ":"ゴ",
    "サ":"ザ","シ":"ジ","ス":"ズ","セ":"ゼ","ソ":"ゾ",
    "タ":"ダ","チ":"ヂ","ツ":"ヅ","テ":"デ","ト":"ド",
    "ハ":"バ","ヒ":"ビ","フ":"ブ","ヘ":"ベ","ホ":"ボ"
  },
  handakuten: {
    "は":"ぱ","ひ":"ぴ","ふ":"ぷ","へ":"ぺ","ほ":"ぽ",
    "ハ":"パ","ヒ":"ピ","フ":"プ","ヘ":"ペ","ホ":"ポ"
  }
};

const ROW_FILTERS = {
  vowels: (k, r) => ["a","i","u","e","o"].includes(r),
  k: (k, r) => r.startsWith("k"),
  s: (k, r) => r.startsWith("s") || r === "shi",
  t: (k, r) => r.startsWith("t") || r === "chi" || r === "tsu",
  n: (k, r) => r.startsWith("n"),
  h: (k, r) => r.startsWith("h") || r === "fu",
  m: (k, r) => r.startsWith("m"),
  y: (k, r) => r.startsWith("y"),
  r: (k, r) => r.startsWith("r"),
  w: (k, r) => r === "wa" || r === "wo" || r === "n"
};

const ROW_KEYS = ["vowels","k","s","t","n","h","m","y","r","w"];

// ---------- Utils ----------
function sanitizeSeed(raw) {
  return (raw || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function todaySeed() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `day${y}${m}${day}`;
}
function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function prngFrom(seedStr) {
  let s = hash32(seedStr || "default");
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function debounce(fn, ms) {
  let tmr = null;
  return (...args) => {
    if (tmr) clearTimeout(tmr);
    tmr = setTimeout(() => fn(...args), ms);
  };
}
function toast(msg) {
  const el = document.getElementById("appToast");
  document.getElementById("toastBody").textContent = msg;
  bootstrap.Toast.getOrCreateInstance(el, { delay: 1400 }).show();
}
function applyTheme(isDark) {
  document.documentElement.setAttribute("data-bs-theme", isDark ? "dark" : "light");
}
function combinedRowPredicate(selectedKeys) {
  const keys = (selectedKeys || []).filter(k => ROW_FILTERS[k]);
  if (keys.length === 0) return () => true;
  return (kana, romaji) => keys.some(k => ROW_FILTERS[k](kana, romaji));
}

/* 10 cols on large screens */
function getResponsiveCols() {
  const w = window.innerWidth;
  if (w < 380) return 3;
  if (w < 576) return 4;
  if (w < 768) return 5;
  if (w < 992) return 7;
  return 10;
}

// ---------- URL params ----------
function buildUrlWithParams({ lang, type, seed, dakuten, font, rows, romaji, dark }) {
  const url = new URL(window.location.href);
  const p = url.searchParams;

  const setOrDel = (key, val, isDefaultish = false) => {
    if (!val || isDefaultish) p.delete(key);
    else p.set(key, val);
  };

  setOrDel("lang", lang, lang === "en");
  setOrDel("type", type, type === "hiragana");
  setOrDel("seed", seed, false);
  setOrDel("d", dakuten ? "1" : "", false);
  setOrDel("font", font, font === "system-ui");

  const rowsVal = (rows && rows.length) ? rows.join(",") : "";
  setOrDel("rows", rowsVal, false);

  setOrDel("r", romaji ? "1" : "", false);
  setOrDel("dark", dark ? "1" : "", false);

  url.search = p.toString();
  return url.toString();
}

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const rowsRaw = p.get("rows") || "";
  const rows = rowsRaw.split(",").map(s => s.trim()).filter(s => ROW_KEYS.includes(s));

  const lang = (p.get("lang") || "en").toLowerCase();
  const langNorm = (lang === "de" || lang === "ja") ? lang : "en";

  return {
    lang: langNorm,
    type: (p.get("type") === "katakana") ? "katakana" : "hiragana",
    seed: sanitizeSeed(p.get("seed") || ""),
    dakuten: p.get("d") === "1",
    font: p.get("font") || "system-ui",
    rows,
    romaji: p.get("r") === "1",
    dark: p.get("dark") === "1"
  };
}

// ---------- Storage ----------
const PREF_KEY = "kanaShufflePrefs_v7";
const SEED_KEY = "kanaShuffleSeed_v5";

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || "{}"); }
  catch { return {}; }
}
function savePrefs(prefs) {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
}
function loadDailySeed() {
  try {
    const s = JSON.parse(localStorage.getItem(SEED_KEY) || "{}");
    if (s.day === todaySeed()) return sanitizeSeed(s.seed || "");
  } catch {}
  return "";
}
function saveDailySeed(seed) {
  localStorage.setItem(SEED_KEY, JSON.stringify({ day: todaySeed(), seed: sanitizeSeed(seed || "") }));
}

// ---------- Kana pool ----------
function extendWithDakuten(kanaArr, romajiArr) {
  const kana = kanaArr.slice();
  const romaji = romajiArr.slice();

  for (let i = 0; i < kanaArr.length; i++) {
    const k = kanaArr[i];
    const r = romajiArr[i];

    if (MAPS.dakuten[k]) {
      kana.push(MAPS.dakuten[k]);
      let rr = r;
      if (rr.startsWith("h")) rr = "b" + rr.slice(1);
      if (rr === "shi") rr = "ji";
      if (rr === "chi") rr = "ji";
      if (rr === "tsu") rr = "zu";
      romaji.push(rr);
    }
    if (MAPS.handakuten[k]) {
      kana.push(MAPS.handakuten[k]);
      let rr = r;
      if (rr.startsWith("h")) rr = "p" + rr.slice(1);
      romaji.push(rr);
    }
  }
  return { kana, romaji };
}

function buildPool({ type, dakuten, rows }) {
  const base = BASE[type];
  const pred = combinedRowPredicate(rows);

  const isFiltered = Array.isArray(rows) && rows.length > 0;

  const filteredK = [];
  const filteredR = [];
  for (let i = 0; i < base.kana.length; i++) {
    if (pred(base.kana[i], base.romaji[i])) {
      filteredK.push(base.kana[i]);
      filteredR.push(base.romaji[i]);
    }
  }

  if (dakuten) {
    const ext = extendWithDakuten(filteredK, filteredR);
    return { ...ext, isFiltered };
  }
  return { kana: filteredK, romaji: filteredR, isFiltered };
}

// ---------- Index generation ----------
function generateIndices(rand, poolSize, { maxPerSymbol, avoidImmediateRepeat = true } = {}) {
  const counts = new Uint16Array(poolSize);
  const out = new Uint16Array(GRID_SIZE);

  const minNeeded = Math.ceil(GRID_SIZE / Math.max(1, poolSize));
  if (!Number.isFinite(maxPerSymbol) || maxPerSymbol < minNeeded) {
    maxPerSymbol = minNeeded;
  }

  let prev = 65535;

  for (let i = 0; i < GRID_SIZE; i++) {
    let idx = 0;
    let placed = false;

    for (let tries = 0; tries < 5000; tries++) {
      idx = (rand() * poolSize) | 0;
      if (avoidImmediateRepeat && idx === prev) continue;
      if (counts[idx] >= maxPerSymbol) continue;
      placed = true;
      break;
    }

    if (!placed) {
      for (let j = 0; j < poolSize; j++) {
        if ((!avoidImmediateRepeat || j !== prev) && counts[j] < maxPerSymbol) {
          idx = j;
          break;
        }
      }
    }

    counts[idx]++;
    out[i] = idx;
    prev = idx;
  }

  return out;
}

// ---------- Timer ----------
let timerDefault = 60;
let remaining = timerDefault;
let running = false;
let interval = null;

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function updateTimer() {
  document.getElementById("timerDisplay").textContent = formatTime(remaining);
}
function startTimer() {
  if (running) return;
  running = true;
  document.querySelector("#btnPlayPause i").classList.replace("fa-play", "fa-pause");
  interval = setInterval(() => {
    if (remaining > 0) {
      remaining--;
      updateTimer();
    } else {
      pauseTimer();
      document.querySelector("header").classList.add("header-blink");
      toast(t("toastTime"));
    }
  }, 1000);
}
function pauseTimer() {
  running = false;
  document.querySelector("#btnPlayPause i").classList.replace("fa-pause", "fa-play");
  if (interval) clearInterval(interval);
  interval = null;
}
function resetTimer() {
  pauseTimer();
  remaining = timerDefault;
  updateTimer();
  document.querySelector("header").classList.remove("header-blink");
}

// ---------- Row UI ----------
function rowLabelKey(rowKey) {
  return `row_${rowKey}`;
}

function renderRowCheckboxes(selectedRows) {
  const box = document.getElementById("rowFilterBox");
  box.replaceChildren();

  const sel = new Set((selectedRows || []).filter(k => ROW_KEYS.includes(k)));

  for (const key of ROW_KEYS) {
    const col = document.createElement("div");
    col.className = "col-6";

    const id = `row_${key}`;

    const wrap = document.createElement("div");
    wrap.className = "form-check";

    const input = document.createElement("input");
    input.className = "form-check-input";
    input.type = "checkbox";
    input.id = id;
    input.value = key;
    input.checked = sel.has(key);

    const label = document.createElement("label");
    label.className = "form-check-label";
    label.htmlFor = id;
    label.textContent = t(rowLabelKey(key));

    wrap.appendChild(input);
    wrap.appendChild(label);
    col.appendChild(wrap);
    box.appendChild(col);
  }
}

function readSelectedRowsFromUI() {
  const box = document.getElementById("rowFilterBox");
  const checked = [...box.querySelectorAll('input[type="checkbox"]:checked')].map(x => x.value);
  return checked.filter(k => ROW_KEYS.includes(k));
}

// ---------- UI texts ----------
function applyLanguageToUI() {
  document.getElementById("txtTitle").textContent = t("title");
  document.getElementById("settingsLabel").textContent = t("settings");

  document.getElementById("txtShuffle").textContent = t("shuffle");
  document.getElementById("txtRomaji").textContent = t("romaji");
  document.getElementById("txtCopyLink").textContent = t("copyLink");

  document.getElementById("txtShortcuts").innerHTML = t("shortcutsHTML");
  document.getElementById("txtTip").textContent = t("tip");

  document.getElementById("lblLang").textContent = t("language");
  document.getElementById("lblKanaType").textContent = t("kanaType");
  document.getElementById("optHira").textContent = t("hiragana");
  document.getElementById("optKata").textContent = t("katakana");

  document.getElementById("lblDakutenTitle").textContent = t("dakutenTitle");
  document.getElementById("lblDakutenDesc").textContent = t("dakutenDesc");

  document.getElementById("lblRowsTitle").textContent = t("rowsTitle");
  document.getElementById("lblRowsDesc").textContent = t("rowsDesc");
  document.getElementById("btnRowsAll").textContent = t("rowsAll");
  document.getElementById("btnRowsNone").textContent = t("rowsNone");

  document.getElementById("lblFont").textContent = t("font");

  document.getElementById("lblSeed").textContent = t("seed");
  document.getElementById("seedInput").placeholder = t("seedPh");

  document.getElementById("lblDarkTitle").textContent = t("darkTitle");
  document.getElementById("lblDarkDesc").textContent = t("darkDesc");
  document.getElementById("txtResetPrefs").textContent = t("resetPrefs");

  document.getElementById("toastTitle").textContent = t("title");

  renderRowCheckboxes(state.rows);
}

// ---------- Render ----------
let lastRenderKey = "";

function render() {
  const cols = getResponsiveCols();
  const seedUsed = state.seed || todaySeed();

  const renderKey = JSON.stringify({ ...state, cols, seedUsed });
  if (renderKey === lastRenderKey) return;
  lastRenderKey = renderKey;

  const seedHint = document.getElementById("seedHint");
  if (seedHint) seedHint.textContent = `Seed: ${seedUsed}`;

  const pool = buildPool(state);
  const maxPer = pool.isFiltered ? 9999 : 2;

  const rand = prngFrom(seedUsed);
  const indices = generateIndices(rand, pool.kana.length, {
    maxPerSymbol: maxPer,
    avoidImmediateRepeat: true
  });

  const grid = document.getElementById("kanaGrid");
  grid.style.setProperty("--cols", cols);

  const frag = document.createDocumentFragment();
  for (let i = 0; i < GRID_SIZE; i++) {
    const idx = indices[i];

    const cell = document.createElement("div");
    cell.className = "kana-cell";
    cell.setAttribute("role", "gridcell");

    const k = document.createElement("span");
    k.className = "kana-char";
    k.textContent = pool.kana[idx];
    k.style.fontFamily = `"${state.font}", system-ui, sans-serif`;

    const r = document.createElement("span");
    r.className = "kana-romaji";
    r.textContent = pool.romaji[idx];

    cell.appendChild(k);
    cell.appendChild(r);
    frag.appendChild(cell);
  }

  grid.replaceChildren(frag);

  const card = document.getElementById("kanaCard");
  card.classList.toggle("show-romaji", !!state.romaji);
  document.getElementById("btnToggleRomaji").setAttribute("aria-pressed", String(!!state.romaji));
}

// ---------- State sync ----------
function syncUIFromState() {
  document.getElementById("langSelect").value = state.lang;
  document.getElementById("kanaType").value = state.type;
  document.getElementById("chkDakuten").checked = !!state.dakuten;
  document.getElementById("fontSelect").value = state.font || "system-ui";
  document.getElementById("chkDark").checked = !!state.dark;

  renderRowCheckboxes(state.rows || []);
  document.getElementById("seedInput").value = state.seed || "";

  applyTheme(!!state.dark);

  const card = document.getElementById("kanaCard");
  card.classList.toggle("show-romaji", !!state.romaji);
  document.getElementById("btnToggleRomaji").setAttribute("aria-pressed", String(!!state.romaji));
}

function readStateFromUI() {
  state.lang = document.getElementById("langSelect").value || "en";
  state.type = document.getElementById("kanaType").value;
  state.dakuten = document.getElementById("chkDakuten").checked;
  state.font = document.getElementById("fontSelect").value;
  state.dark = document.getElementById("chkDark").checked;
  state.rows = readSelectedRowsFromUI();
  state.seed = sanitizeSeed(document.getElementById("seedInput").value);
  state.romaji = document.getElementById("kanaCard").classList.contains("show-romaji");
}

function persistAndUpdateUrl() {
  savePrefs({
    lang: state.lang,
    type: state.type,
    dakuten: state.dakuten,
    font: state.font,
    rows: state.rows,
    dark: state.dark
  });

  saveDailySeed(state.seed);

  const seedUsed = state.seed || todaySeed();

  const url = buildUrlWithParams({
    lang: state.lang,
    type: state.type,
    seed: seedUsed,
    dakuten: state.dakuten,
    font: state.font,
    rows: state.rows,
    romaji: state.romaji,
    dark: state.dark
  });

  window.history.replaceState(null, "", url);
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", async () => {
  const params = readParams();
  const prefs = loadPrefs();
  const seedFromDaily = loadDailySeed();

  state.lang = params.lang || prefs.lang || "en";
  state.type = params.type || prefs.type || "hiragana";
  state.dakuten = (typeof params.dakuten === "boolean") ? params.dakuten : !!prefs.dakuten;
  state.font = params.font || prefs.font || "system-ui";
  state.rows = (params.rows && params.rows.length) ? params.rows : (prefs.rows || []);
  state.seed = params.seed || seedFromDaily || "";
  state.romaji = !!params.romaji;
  state.dark = (typeof params.dark === "boolean") ? params.dark : !!prefs.dark;

  await setLanguage(state.lang);
  syncUIFromState();
  applyLanguageToUI();

  updateTimer();
  render();
  persistAndUpdateUrl();

  const rerender = async () => {
    readStateFromUI();
    applyTheme(!!state.dark);

    // If language changed, load it before applying texts
    await setLanguage(state.lang);
    syncUIFromState();
    applyLanguageToUI();

    render();
    persistAndUpdateUrl();
  };

  document.getElementById("btnShuffle").addEventListener("click", async () => {
    readStateFromUI();
    await setLanguage(state.lang);
    render();
    persistAndUpdateUrl();
    toast(t("toastShuffled"));
  });

  document.getElementById("btnToggleRomaji").addEventListener("click", async () => {
    document.getElementById("kanaCard").classList.toggle("show-romaji");
    await rerender();
  });

  document.getElementById("btnCopyLink").addEventListener("click", async () => {
    readStateFromUI();
    await setLanguage(state.lang);

    const seedUsed = state.seed || todaySeed();
    const url = buildUrlWithParams({ ...state, seed: seedUsed });

    try {
      await navigator.clipboard.writeText(url);
      toast(t("toastLinkCopied"));
    } catch {
      toast(t("toastClipboardBlocked"));
    }
  });

  document.getElementById("btnPlayPause").addEventListener("click", () => {
    running ? pauseTimer() : startTimer();
  });
  document.getElementById("btnReset").addEventListener("click", resetTimer);

  document.getElementById("btnClearSeed").addEventListener("click", async () => {
    document.getElementById("seedInput").value = "";
    document.getElementById("seedInput").focus();
    await rerender();
  });

  ["langSelect","kanaType","chkDakuten","fontSelect","chkDark"].forEach(id => {
    document.getElementById(id).addEventListener("change", () => { rerender(); });
  });

  document.getElementById("rowFilterBox").addEventListener("change", () => { rerender(); });

  document.getElementById("btnRowsAll").addEventListener("click", () => {
    state.rows = ROW_KEYS.slice();
    renderRowCheckboxes(state.rows);
    rerender();
  });

  document.getElementById("btnRowsNone").addEventListener("click", () => {
    state.rows = [];
    renderRowCheckboxes(state.rows);
    rerender();
  });

  document.getElementById("seedInput").addEventListener("input", debounce(() => { rerender(); }, 200));

  document.getElementById("btnResetPrefs").addEventListener("click", async () => {
    localStorage.removeItem(PREF_KEY);
    localStorage.removeItem(SEED_KEY);
    toast(t("resetPrefs"));
    window.location.href = window.location.pathname;
  });

  window.addEventListener("resize", debounce(() => render(), 120));

  // Keyboard shortcuts (no shuffle)
  window.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
    const typing = tag === "input" || tag === "textarea" || e.target?.isContentEditable;
    if (typing) return;

    if (e.code === "Space") { e.preventDefault(); running ? pauseTimer() : startTimer(); }
    if (e.key.toLowerCase() === "m") document.getElementById("btnToggleRomaji").click();
  });
});