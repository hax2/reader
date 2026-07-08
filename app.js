const audio = document.querySelector("#audio");
const app = document.querySelector(".app");
const audioFile = document.querySelector("#audioFile");
const transcriptFile = document.querySelector("#transcriptFile");
const appTitle = document.querySelector("#app-title");
const backToLibrary = document.querySelector("#backToLibrary");
const trackList = document.querySelector("#trackList");
const playPause = document.querySelector("#playPause");
const playIcon = document.querySelector("#playIcon");
const seek = document.querySelector("#seek");
const currentTimeEl = document.querySelector("#currentTime");
const durationEl = document.querySelector("#duration");
const reader = document.querySelector("#reader");
const statusEl = document.querySelector("#status");
const pasteTranscript = document.querySelector("#pasteTranscript");
const usePastedText = document.querySelector("#usePastedText");
const definition = document.querySelector("#definition");
const wordPopover = document.querySelector("#wordPopover");
const canvas = document.querySelector("#waveform");
const ctx = canvas.getContext("2d");

let words = [];
let currentWordIndex = -1;
let rafId = 0;
let objectUrl = "";
let tracks = [];
let activeTrackId = "";
let pendingResumeTime = 0;
let lastProgressSave = 0;
let selectedWordButton = null;
let definitionRequestId = 0;
let translationCache = loadTranslationCache();
let progressCache = loadProgressCache();

drawWaveform(0);
loadLibrary();

backToLibrary.addEventListener("click", () => {
  showLibrary();
});

trackList.addEventListener("click", (event) => {
  const button = event.target.closest(".track-card");
  if (!button) return;
  const track = tracks.find((item) => item.id === button.dataset.trackId);
  if (track) loadTrack(track);
});

audioFile.addEventListener("change", () => {
  const file = audioFile.files?.[0];
  if (!file) return;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  activeTrackId = "";
  appTitle.textContent = file.name;
  showReader();
  setAudioSource(objectUrl, `${file.name} loaded.`);
});

transcriptFile.addEventListener("change", async () => {
  const file = transcriptFile.files?.[0];
  if (!file) return;
  const text = await file.text();
  const parsed = parseTranscript(text, file.name);
  setWords(parsed, parsed.some((word) => Number.isFinite(word.start)));
  status(`${file.name} loaded with ${parsed.length.toLocaleString()} words.`);
});

usePastedText.addEventListener("click", () => {
  const text = pasteTranscript.value.trim();
  if (!text) {
    status("Paste Spanish text first.");
    return;
  }
  const parsed = tokenizeUntimed(text);
  assignApproximateTimes(parsed);
  setWords(parsed, false);
  status("Pasted text loaded. Highlighting is approximate because no word timings were provided.");
});

playPause.addEventListener("click", () => {
  if (!audio.src) return;
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
});

audio.addEventListener("play", () => {
  playIcon.textContent = "❚❚";
  tick();
});

audio.addEventListener("pause", () => {
  playIcon.textContent = "▶";
  cancelAnimationFrame(rafId);
  updateProgress();
});

audio.addEventListener("loadedmetadata", () => {
  seek.max = audio.duration || 0;
  seek.disabled = false;
  playPause.disabled = false;
  durationEl.textContent = formatTime(audio.duration);
  if (words.length && !hasRealTimings(words)) assignApproximateTimes(words);
  if (pendingResumeTime > 0 && audio.duration) {
    audio.currentTime = Math.min(pendingResumeTime, Math.max(0, audio.duration - 1));
    pendingResumeTime = 0;
  }
  drawWaveform(0);
  updateProgress();
});

audio.addEventListener("ended", () => {
  playIcon.textContent = "▶";
  saveActiveProgress(true);
  updateProgress();
});

seek.addEventListener("input", () => {
  audio.currentTime = Number(seek.value);
  saveActiveProgress(true);
  updateProgress();
});

reader.addEventListener("click", (event) => {
  const target = event.target.closest(".word");
  if (!target) return;
  event.stopPropagation();
  showDefinition(words[Number(target.dataset.index)], target);
});

document.addEventListener("click", (event) => {
  if (wordPopover.hidden) return;
  if (wordPopover.contains(event.target) || event.target.closest(".word")) return;
  hideWordPopover();
});

window.addEventListener("resize", () => {
  if (selectedWordButton && !wordPopover.hidden) positionWordPopover(selectedWordButton);
});

window.addEventListener("scroll", () => {
  if (selectedWordButton && !wordPopover.hidden) positionWordPopover(selectedWordButton);
}, { passive: true });

function setAudioSource(src, message) {
  audio.src = src;
  audio.load();
  seek.value = "0";
  currentTimeEl.textContent = "0:00";
  currentWordIndex = -1;
  status(message);
}

async function loadLibrary() {
  try {
    const response = await fetch("library.json", { cache: "no-store" });
    if (!response.ok) throw new Error("No library");
    const library = await response.json();
    if (!Array.isArray(library)) throw new Error("Invalid library");
    tracks = library
      .filter((track) => track.audio)
      .map((track) => ({
        ...track,
        id: track.id || track.audio,
        title: track.title || track.audio
      }));
    renderTrackList();
  } catch {
    trackList.innerHTML = `<p class="muted">No hosted readings found. Add audio files and run <code>python3 scripts/build_library.py</code>.</p>`;
  }
}

async function loadTrack(track) {
  activeTrackId = track.id;
  pendingResumeTime = progressCache[activeTrackId]?.time || 0;
  appTitle.textContent = track.title;
  showReader();
  setAudioSource(track.audio, `${track.title} loaded.`);
  renderTrackList();

  if (!track.transcript) {
    words = [];
    reader.replaceChildren();
    status(`${track.title} has no transcript yet.`);
    return;
  }

  try {
    const response = await fetch(track.transcript);
    if (!response.ok) throw new Error("Transcript not found");
    const text = await response.text();
    const parsed = parseTranscript(text, track.transcript);
    setWords(parsed, parsed.some((word) => Number.isFinite(word.start)));
    const resumeMessage = pendingResumeTime > 0 ? ` Resuming at ${formatTime(pendingResumeTime)}.` : "";
    status(`${track.title} loaded with ${parsed.length.toLocaleString()} synced words.${resumeMessage}`);
  } catch {
    status(`${track.title} loaded, but its transcript could not be loaded.`);
  }
}

function showLibrary() {
  app.dataset.view = "library";
  document.title = "Spanish Listening Reader";
  hideWordPopover();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showReader() {
  app.dataset.view = "reader";
  document.title = appTitle.textContent ? `${appTitle.textContent} · Spanish Listening Reader` : "Spanish Listening Reader";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderTrackList() {
  trackList.replaceChildren();
  if (!tracks.length) {
    trackList.innerHTML = `<p class="muted">No hosted readings found.</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const track of tracks) {
    const saved = progressCache[track.id] || {};
    const percent = saved.duration ? Math.min(100, Math.round((saved.time / saved.duration) * 100)) : 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `track-card${track.id === activeTrackId ? " active" : ""}`;
    button.dataset.trackId = track.id;
    button.style.setProperty("--progress", `${percent}%`);
    button.innerHTML = `
      <span class="track-main">
        <span class="track-title">${escapeHtml(track.title)}</span>
        <span class="track-meta">${track.transcript ? "Synced transcript" : "Audio only"}</span>
        <span class="track-progress-label">${progressLabel(saved)}</span>
      </span>
      <span class="track-action" aria-hidden="true">&rarr;</span>
      <span class="track-progress" aria-hidden="true"><span></span></span>
    `;
    fragment.append(button);
  }
  trackList.append(fragment);
}

function setWords(nextWords, precise) {
  words = nextWords.map((word, index) => ({ ...word, index }));
  if (!precise) assignApproximateTimes(words);
  renderWords();
  updateProgress();
}

function parseTranscript(text, name) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const lower = name.toLowerCase();
  if (lower.endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parseJsonTranscript(trimmed);
  }
  if (lower.endsWith(".vtt") || lower.endsWith(".srt") || trimmed.includes("-->")) {
    return parseCueTranscript(trimmed);
  }
  return tokenizeUntimed(trimmed);
}

function parseJsonTranscript(text) {
  const data = JSON.parse(text);
  const source = Array.isArray(data)
    ? data
    : Array.isArray(data.words)
      ? data.words
      : Array.isArray(data.segments)
        ? data.segments.flatMap((segment) => segment.words || wordsFromSegment(segment))
        : [];

  return source
    .map((item) => ({
      text: String(item.word ?? item.text ?? "").trim(),
      start: toSeconds(item.start ?? item.startTime),
      end: toSeconds(item.end ?? item.endTime),
      translation: item.translation ?? item.meaning ?? ""
    }))
    .filter((item) => item.text);
}

function wordsFromSegment(segment) {
  const tokens = tokenizeUntimed(segment.text || "");
  const start = toSeconds(segment.start);
  const end = toSeconds(segment.end);
  const span = Math.max(0.05, (end - start) / Math.max(1, tokens.length));
  return tokens.map((token, index) => ({
    word: token.text,
    start: start + index * span,
    end: start + (index + 1) * span
  }));
}

function parseCueTranscript(text) {
  const clean = text.replace(/\r/g, "");
  const blocks = clean
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const parsed = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((line) => line.trim() && line.trim() !== "WEBVTT");
    const timingLine = lines.find((line) => line.includes("-->"));
    if (!timingLine) continue;
    const timingIndex = lines.indexOf(timingLine);
    const [rawStart, rawEnd] = timingLine.split("-->").map((part) => part.trim().split(/\s+/)[0]);
    const start = parseTimestamp(rawStart);
    const end = parseTimestamp(rawEnd);
    const cueText = lines.slice(timingIndex + 1).join(" ").replace(/<[^>]+>/g, "");
    const cueWords = tokenizeUntimed(cueText);
    const span = Math.max(0.05, (end - start) / Math.max(1, cueWords.length));
    cueWords.forEach((word, index) => {
      parsed.push({
        ...word,
        start: start + index * span,
        end: start + (index + 1) * span
      });
    });
  }

  return parsed;
}

function tokenizeUntimed(text) {
  const matches = text.matchAll(/[\p{L}\p{M}\d]+(?:['’][\p{L}\p{M}\d]+)?|[^\p{L}\p{M}\d]+/gu);
  const parsed = [];
  for (const match of matches) {
    const token = match[0];
    if (/^[\p{L}\p{M}\d]/u.test(token)) {
      parsed.push({ text: token, separator: "" });
    } else if (parsed.length) {
      parsed[parsed.length - 1].separator += token;
    }
  }
  return parsed;
}

function assignApproximateTimes(list) {
  if (!audio.duration || !Number.isFinite(audio.duration) || !list.length) return;
  const weightedTotal = list.reduce((sum, word) => sum + wordWeight(word.text), 0);
  let cursor = 0;
  for (const word of list) {
    const duration = audio.duration * (wordWeight(word.text) / weightedTotal);
    word.start = cursor;
    word.end = cursor + duration;
    cursor = word.end;
  }
}

function wordWeight(text) {
  return Math.max(0.7, Math.min(2.8, text.length / 4));
}

function renderWords() {
  reader.replaceChildren();
  hideWordPopover();
  const fragment = document.createDocumentFragment();
  let paragraph = document.createElement("p");
  let sentenceCount = 0;

  words.forEach((word, index) => {
    const span = document.createElement("button");
    span.type = "button";
    span.className = "word";
    span.dataset.index = String(index);
    span.textContent = word.text;
    paragraph.append(span);
    paragraph.append(document.createTextNode(word.separator || " "));

    if (/[.!?…]["')\]]*$/.test(word.text)) {
      sentenceCount += 1;
    }
    if (sentenceCount >= 4 && index < words.length - 1) {
      fragment.append(paragraph);
      paragraph = document.createElement("p");
      sentenceCount = 0;
    }
  });
  if (paragraph.childNodes.length) fragment.append(paragraph);
  reader.append(fragment);
}

function tick() {
  updateProgress();
  rafId = requestAnimationFrame(tick);
}

function updateProgress() {
  const duration = audio.duration || 0;
  const current = audio.currentTime || 0;
  seek.value = String(current);
  currentTimeEl.textContent = formatTime(current);
  durationEl.textContent = formatTime(duration);
  drawWaveform(duration ? current / duration : 0);
  updateCurrentWord(current);
  saveActiveProgress(false);
}

function updateCurrentWord(time) {
  if (!words.length) return;
  const index = findWordAt(time);
  if (index === currentWordIndex) return;
  if (currentWordIndex >= 0) {
    const previous = reader.querySelector(`[data-index="${currentWordIndex}"]`);
    previous?.classList.remove("current");
    previous?.classList.add("read");
  }
  currentWordIndex = index;
  if (index >= 0) {
    const active = reader.querySelector(`[data-index="${index}"]`);
    active?.classList.add("current");
    active?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  }
}

function findWordAt(time) {
  let low = 0;
  let high = words.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const word = words[mid];
    if (time < word.start) high = mid - 1;
    else if (time >= word.end) low = mid + 1;
    else return mid;
  }
  return Math.max(0, Math.min(words.length - 1, low));
}

async function showDefinition(word, anchor) {
  if (!word) return;
  selectedWordButton?.classList.remove("selected");
  selectedWordButton = anchor || null;
  selectedWordButton?.classList.add("selected");
  const requestId = ++definitionRequestId;
  const normalized = normalizeWord(word.text);
  renderDefinition(word.text, "Looking up English meaning...");

  if (word.translation) {
    renderDefinition(word.text, word.translation, anchor);
    return;
  }
  if (translationCache[normalized]) {
    renderDefinition(word.text, translationCache[normalized], anchor);
    return;
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(normalized)}&langpair=es|en`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Lookup failed");
    const data = await response.json();
    const translated = data?.responseData?.translatedText;
    if (!translated) throw new Error("No translation returned");
    translationCache[normalized] = translated;
    saveTranslationCache(translationCache);
    if (requestId === definitionRequestId) renderDefinition(word.text, translated, anchor);
  } catch {
    const spanishDict = `https://www.spanishdict.com/translate/${encodeURIComponent(normalized)}`;
    const wordReference = `https://www.wordreference.com/es/en/translation.asp?spen=${encodeURIComponent(normalized)}`;
    if (requestId !== definitionRequestId) return;
    const fallback = `No automatic result. <a href="${spanishDict}" target="_blank" rel="noreferrer">SpanishDict</a> or <a href="${wordReference}" target="_blank" rel="noreferrer">WordReference</a>.`;
    renderDefinition(word.text, fallback, anchor, true);
  }
}

function renderDefinition(word, translation, anchor = selectedWordButton, allowHtml = false) {
  const translationHtml = allowHtml ? translation : escapeHtml(translation);
  const content = `
    <p class="definition-word">${escapeHtml(word)}</p>
    <p class="translation">${translationHtml}</p>
  `;
  definition.innerHTML = content;
  wordPopover.innerHTML = content;
  wordPopover.hidden = false;
  if (anchor) positionWordPopover(anchor);
}

function positionWordPopover(anchor) {
  const rect = anchor.getBoundingClientRect();
  const margin = 12;
  const width = Math.min(320, window.innerWidth - margin * 2);
  wordPopover.style.width = `${width}px`;
  wordPopover.style.left = "0px";
  wordPopover.style.top = "0px";

  const popoverRect = wordPopover.getBoundingClientRect();
  const desiredLeft = rect.left + rect.width / 2 - width / 2;
  const left = Math.max(margin, Math.min(desiredLeft, window.innerWidth - width - margin));
  const aboveTop = rect.top - popoverRect.height - 10;
  const belowTop = rect.bottom + 10;
  const top = aboveTop >= margin ? aboveTop : Math.min(belowTop, window.innerHeight - popoverRect.height - margin);

  wordPopover.style.left = `${left}px`;
  wordPopover.style.top = `${Math.max(margin, top)}px`;
  wordPopover.dataset.placement = aboveTop >= margin ? "above" : "below";
}

function hideWordPopover() {
  selectedWordButton?.classList.remove("selected");
  selectedWordButton = null;
  wordPopover.hidden = true;
}

function drawWaveform(progress) {
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#eef3f1";
  ctx.fillRect(0, 0, width, height);

  const bars = 96;
  const gap = 3;
  const barWidth = width / bars - gap;
  for (let i = 0; i < bars; i += 1) {
    const phase = i / bars;
    const amplitude = 0.22 + 0.58 * Math.abs(Math.sin(i * 0.39) * Math.cos(i * 0.17));
    const barHeight = Math.max(8, height * amplitude);
    const x = i * (barWidth + gap);
    const y = (height - barHeight) / 2;
    ctx.fillStyle = phase <= progress ? "#0d766e" : "#b8c7c2";
    roundRect(ctx, x, y, barWidth, barHeight, 4);
    ctx.fill();
  }
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function hasRealTimings(list) {
  return list.some((word) => Number.isFinite(word.start) && Number.isFinite(word.end));
}

function toSeconds(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  if (/^\d+(\.\d+)?s?$/.test(value)) return Number.parseFloat(value);
  return parseTimestamp(value);
}

function parseTimestamp(value) {
  const parts = value.replace(",", ".").split(":").map(Number);
  if (parts.some(Number.isNaN)) return Number.NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const remainder = String(whole % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function progressLabel(saved) {
  if (!saved?.time || !saved?.duration) return "Not started";
  const percent = Math.min(100, Math.round((saved.time / saved.duration) * 100));
  if (percent >= 97) return "Completed";
  return `${formatTime(saved.time)} of ${formatTime(saved.duration)} · ${percent}%`;
}

function saveActiveProgress(force) {
  if (!activeTrackId || !audio.duration || !Number.isFinite(audio.duration)) return;
  const now = Date.now();
  if (!force && now - lastProgressSave < 1500) return;
  lastProgressSave = now;

  const time = audio.ended ? audio.duration : audio.currentTime;
  progressCache[activeTrackId] = {
    time: Math.max(0, Math.min(time, audio.duration)),
    duration: audio.duration,
    updatedAt: new Date().toISOString()
  };
  saveProgressCache(progressCache);
  renderTrackList();
}

function normalizeWord(word) {
  return word.toLocaleLowerCase("es").replace(/[^\p{L}\p{M}\d]/gu, "");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function status(message) {
  statusEl.textContent = message;
}

function loadTranslationCache() {
  try {
    return JSON.parse(localStorage.getItem("spanish-reader-translations") || "{}");
  } catch {
    return {};
  }
}

function saveTranslationCache(cache) {
  localStorage.setItem("spanish-reader-translations", JSON.stringify(cache));
}

function loadProgressCache() {
  try {
    return JSON.parse(localStorage.getItem("spanish-reader-progress") || "{}");
  } catch {
    return {};
  }
}

function saveProgressCache(cache) {
  localStorage.setItem("spanish-reader-progress", JSON.stringify(cache));
}
