const audio = document.querySelector("#audio");
const app = document.querySelector(".app");
const audioFile = document.querySelector("#audioFile");
const transcriptFile = document.querySelector("#transcriptFile");
const appTitle = document.querySelector("#app-title");
const backToLibrary = document.querySelector("#backToLibrary");
const trackList = document.querySelector("#trackList");
const librarySearch = document.querySelector("#librarySearch");
const formatFilter = document.querySelector("#formatFilter");
const librarySort = document.querySelector("#librarySort");
const levelFilters = [...document.querySelectorAll(".level-filter")];
const collectionTabs = [...document.querySelectorAll(".collection-tab")];
const catalogSummary = document.querySelector("#catalogSummary");
const playPause = document.querySelector("#playPause");
const playbackRateButton = document.querySelector("#playbackRate");
const playbackRateValue = playbackRateButton.querySelector(".speed-value");
const speedMenu = document.querySelector("#speedMenu");
const speedOptions = [...speedMenu.querySelectorAll("[data-rate]")];
const SPEED_RATES = speedOptions.map((option) => Number(option.dataset.rate));
const playIcon = document.querySelector("#playIcon");
const skipBack = document.querySelector("#skipBack");
const skipForward = document.querySelector("#skipForward");
const readModeToggle = document.querySelector("#readModeToggle");
const readModeLabel = readModeToggle?.querySelector(".mode-label");

const PLAY_ICON = `<svg class="play-glyph" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>`;
const PAUSE_ICON = `<svg class="pause-glyph" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="5" y="4" width="4.5" height="16" rx="1"></rect><rect x="14.5" y="4" width="4.5" height="16" rx="1"></rect></svg>`;
const seek = document.querySelector("#seek");
const currentTimeEl = document.querySelector("#currentTime");
const durationEl = document.querySelector("#duration");
const reader = document.querySelector("#reader");
const statusEl = document.querySelector("#status");
const readingMeta = document.querySelector("#readingMeta");
const pasteTranscript = document.querySelector("#pasteTranscript");
const usePastedText = document.querySelector("#usePastedText");
const definition = document.querySelector("#definition");
const studyCount = document.querySelector("#studyCount");
const downloadAnki = document.querySelector("#downloadAnki");
const ankiDialog = document.querySelector("#ankiDialog");
const ankiDialogCount = document.querySelector("#ankiDialogCount");
const ankiCardList = document.querySelector("#ankiCardList");
const closeAnkiDialog = document.querySelector("#closeAnkiDialog");
const cancelAnkiReview = document.querySelector("#cancelAnkiReview");
const downloadReviewedAnki = document.querySelector("#downloadReviewedAnki");
const themeSelect = document.querySelector("#themeSelect");
const highlightSelect = document.querySelector("#highlightSelect");
const textModeSelect = document.querySelector("#textModeSelect");
const settingsMenu = document.querySelector("#settingsMenu");
const appearanceControls = settingsMenu.querySelector(".appearance-controls");
const textSize = document.querySelector("#textSize");
const textSizeValue = document.querySelector("#textSizeValue");
const lineHeight = document.querySelector("#lineHeight");
const lineHeightValue = document.querySelector("#lineHeightValue");
const fontSelect = document.querySelector("#fontSelect");
const readerWidthSelect = document.querySelector("#readerWidthSelect");
const resetAppearance = document.querySelector("#resetAppearance");
const wordPopover = document.querySelector("#wordPopover");
const canvas = document.querySelector("#waveform");
const ctx = canvas.getContext("2d");
const systemThemeQuery = window.matchMedia?.("(prefers-color-scheme: dark)") || null;
const themeOptions = ["system", "paper", "mist", "night"];
const appearanceSettingsVersion = 3;
const difficultyOrder = ["A2", "B1", "B2", "C1"];
const difficultyLabels = {
  A2: "Early reader",
  B1: "Intermediate",
  B2: "Upper intermediate",
  C1: "Advanced"
};

let words = [];
let currentWordIndex = -1;
let readWordCount = -1;
let rafId = 0;
let objectUrl = "";
let tracks = [];
let activeTrackId = "";
let activeAudioSource = "";
let pendingResumeTime = 0;
let lastProgressSave = 0;
let selectedWordButton = null;
let definitionRequestId = 0;
let trackLoadId = 0;
let translationCache = loadTranslationCache();
let sharedGlossary = {};
let progressCache = loadProgressCache();
let studyLog = loadStudyLog();
let appearanceSettings = loadAppearanceSettings();
let sliderPreviewTimer = 0;
let draggingAppearanceSlider = false;
let isReadMode = false;
let catalogSettings = loadCatalogSettings();

applyAppearanceSettings();
drawWaveform(0);
updateStudyControls();
initialize();

librarySearch.value = catalogSettings.search;
formatFilter.value = catalogSettings.format;
librarySort.value = catalogSettings.sort;
updateLevelFilters();
updateCollectionTabs();

collectionTabs.forEach((button, index) => {
  button.addEventListener("click", () => selectCollection(button.dataset.collection));
  button.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = event.key === "Home" ? 0 : event.key === "End" ? collectionTabs.length - 1 : index + (event.key === "ArrowRight" ? 1 : -1);
    nextIndex = (nextIndex + collectionTabs.length) % collectionTabs.length;
    selectCollection(collectionTabs[nextIndex].dataset.collection);
    collectionTabs[nextIndex].focus();
  });
});

librarySearch.addEventListener("input", () => {
  catalogSettings.search = librarySearch.value;
  saveCatalogSettings();
  renderTrackList();
});

formatFilter.addEventListener("change", () => {
  catalogSettings.format = formatFilter.value;
  saveCatalogSettings();
  renderTrackList();
});

librarySort.addEventListener("change", () => {
  catalogSettings.sort = librarySort.value;
  saveCatalogSettings();
  renderTrackList();
});

levelFilters.forEach((button) => {
  button.addEventListener("click", () => {
    catalogSettings.level = button.dataset.level;
    saveCatalogSettings();
    updateLevelFilters();
    renderTrackList();
  });
});

backToLibrary.addEventListener("click", () => {
  showLibrary();
});

window.addEventListener("popstate", () => {
  const routeId = decodeURIComponent(location.hash.slice(1));
  const track = tracks.find((item) => item.id === routeId);
  if (track) loadTrack(track, false);
  else showLibrary(false);
});

trackList.addEventListener("click", (event) => {
  if (event.target.closest("[data-clear-catalog]")) {
    catalogSettings = { search: "", format: "all", sort: "difficulty", level: "all", collection: "all" };
    librarySearch.value = "";
    formatFilter.value = "all";
    librarySort.value = "difficulty";
    updateLevelFilters();
    updateCollectionTabs();
    saveCatalogSettings();
    renderTrackList();
    librarySearch.focus();
    return;
  }
  const button = event.target.closest(".track-card");
  if (!button) return;
  const track = tracks.find((item) => item.id === button.dataset.trackId);
  if (track) loadTrack(track);
});

audioFile.addEventListener("change", () => {
  const file = audioFile.files?.[0];
  if (!file) return;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  audio.pause();
  trackLoadId += 1;
  saveActiveProgress(true);
  objectUrl = URL.createObjectURL(file);
  activeTrackId = "";
  activeAudioSource = objectUrl;
  appTitle.textContent = file.name;
  readingMeta.hidden = true;
  app.dataset.media = "audio";
  setReadMode(false);
  showReader();
  setAudioSource(objectUrl, `${file.name} loaded.`);
});

transcriptFile.addEventListener("change", async () => {
  const file = transcriptFile.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = parseTranscript(text, file.name);
    setWords(parsed, hasValidTimings(parsed));
    status(`${file.name} loaded with ${parsed.length.toLocaleString()} words.`);
  } catch {
    status(`${file.name} could not be read. Check that it is a valid transcript file.`);
  }
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

downloadAnki.addEventListener("click", () => {
  openAnkiReview();
});

closeAnkiDialog.addEventListener("click", () => ankiDialog.close());
cancelAnkiReview.addEventListener("click", () => ankiDialog.close());

downloadReviewedAnki.addEventListener("click", () => {
  downloadAnkiCards();
  ankiDialog.close();
});

ankiCardList.addEventListener("input", (event) => {
  const field = event.target.closest("[data-field]");
  const card = event.target.closest(".anki-card-editor");
  if (!field || !card) return;
  const entry = studyLog[card.dataset.studyKey];
  if (!entry) return;

  const value = field.value;
  if (field.dataset.field === "context") entry.context = escapeHtml(value);
  else entry[field.dataset.field] = value;
  if (field.dataset.field === "word") {
    entry.normalized = normalizeWord(value);
    card.querySelector(".anki-card-editor-header strong").textContent = value || "Untitled word";
  }
  entry.lastSeenAt = new Date().toISOString();
  saveStudyLog(studyLog);
  updateStudyControls();
  updateAnkiReviewCount();
});

ankiCardList.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-card]");
  if (!removeButton) return;
  const card = removeButton.closest(".anki-card-editor");
  if (!card) return;
  delete studyLog[card.dataset.studyKey];
  saveStudyLog(studyLog);
  card.remove();
  updateStudyControls();
  updateAnkiReviewCount();
  if (!studyEntries().length) ankiDialog.close();
});

themeSelect.addEventListener("change", () => {
  appearanceSettings.theme = themeSelect.value;
  saveAppearanceSettings(appearanceSettings);
  applyAppearanceSettings();
});

highlightSelect.addEventListener("change", () => {
  appearanceSettings.highlight = highlightSelect.value;
  saveAppearanceSettings(appearanceSettings);
  applyAppearanceSettings();
});

textModeSelect.addEventListener("change", () => {
  appearanceSettings.textMode = textModeSelect.value;
  saveAppearanceSettings(appearanceSettings);
  applyAppearanceSettings();
});

textSize.addEventListener("input", () => {
  beginSliderPreview(textSize);
  appearanceSettings.textSize = Number(textSize.value);
  saveAppearanceSettings(appearanceSettings);
  applyAppearanceSettings();
  scheduleSliderPreviewEnd();
});

lineHeight.addEventListener("input", () => {
  beginSliderPreview(lineHeight);
  appearanceSettings.lineHeight = Number(lineHeight.value);
  saveAppearanceSettings(appearanceSettings);
  applyAppearanceSettings();
  scheduleSliderPreviewEnd();
});

fontSelect.addEventListener("change", () => {
  appearanceSettings.font = fontSelect.value;
  saveAppearanceSettings(appearanceSettings);
  applyAppearanceSettings();
});

readerWidthSelect.addEventListener("change", () => {
  appearanceSettings.readerWidth = readerWidthSelect.value;
  saveAppearanceSettings(appearanceSettings);
  applyAppearanceSettings();
});

resetAppearance.addEventListener("click", () => {
  const playbackRate = appearanceSettings.playbackRate;
  appearanceSettings = defaultAppearanceSettings();
  appearanceSettings.playbackRate = playbackRate;
  saveAppearanceSettings(appearanceSettings);
  applyAppearanceSettings();
});

[textSize, lineHeight].forEach((slider) => {
  slider.addEventListener("pointerdown", () => {
    draggingAppearanceSlider = true;
    beginSliderPreview(slider);
  });
});

window.addEventListener("pointerup", () => {
  draggingAppearanceSlider = false;
  endSliderPreview();
});
window.addEventListener("pointercancel", () => {
  draggingAppearanceSlider = false;
  endSliderPreview();
});
settingsMenu.addEventListener("toggle", () => {
  if (!settingsMenu.open) endSliderPreview();
});

function beginSliderPreview(slider) {
  window.clearTimeout(sliderPreviewTimer);
  appearanceControls.querySelector(".is-active-control")?.classList.remove("is-active-control");
  slider.closest("label")?.classList.add("is-active-control");
  appearanceControls.classList.add("is-adjusting");
}

function scheduleSliderPreviewEnd() {
  if (draggingAppearanceSlider) return;
  window.clearTimeout(sliderPreviewTimer);
  sliderPreviewTimer = window.setTimeout(endSliderPreview, 700);
}

function endSliderPreview() {
  window.clearTimeout(sliderPreviewTimer);
  appearanceControls.classList.remove("is-adjusting");
  appearanceControls.querySelector(".is-active-control")?.classList.remove("is-active-control");
}

const handleSystemThemeChange = () => {
  if (appearanceSettings.theme === "system") {
    applyAppearanceSettings();
  }
};

if (systemThemeQuery?.addEventListener) {
  systemThemeQuery.addEventListener("change", handleSystemThemeChange);
} else if (systemThemeQuery?.addListener) {
  systemThemeQuery.addListener(handleSystemThemeChange);
}

playPause.addEventListener("click", () => {
  if (!audio.src) return;
  if (audio.paused) {
    audio.play().catch(() => status("Playback could not be started."));
  } else {
    audio.pause();
  }
});

skipBack.addEventListener("click", () => {
  if (!audio.src || !audio.duration) return;
  audio.currentTime = Math.max(0, audio.currentTime - 10);
  updateProgress();
});

skipForward.addEventListener("click", () => {
  if (!audio.src || !audio.duration) return;
  audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
  updateProgress();
});

readModeToggle.addEventListener("click", () => {
  if (app.dataset.media === "text") return;
  setReadMode(!isReadMode);
});

document.addEventListener("keydown", (event) => {
  const tag = event.target.tagName;
  if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || event.target.isContentEditable) return;
  if (app.dataset.view !== "reader") return;

  switch (event.key) {
    case "ArrowLeft":
      event.preventDefault();
      audio.currentTime = Math.max(0, audio.currentTime - 10);
      updateProgress();
      break;
    case "ArrowRight":
      event.preventDefault();
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
      updateProgress();
      break;
    case " ":
      event.preventDefault();
      if (!audio.src) return;
      if (audio.paused) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
      break;
  }
});

playbackRateButton.addEventListener("click", () => {
  setSpeedMenuOpen(speedMenu.hidden);
});

speedMenu.addEventListener("click", (event) => {
  const option = event.target.closest("[data-rate]");
  if (!option) return;
  setPlaybackRate(Number(option.dataset.rate));
  setSpeedMenuOpen(false);
  playbackRateButton.focus();
});

speedMenu.addEventListener("keydown", (event) => {
  const currentIndex = speedOptions.indexOf(document.activeElement);
  let nextIndex = currentIndex;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % speedOptions.length;
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + speedOptions.length) % speedOptions.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = speedOptions.length - 1;
  if (nextIndex === currentIndex) return;
  event.preventDefault();
  speedOptions[nextIndex].focus();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".speed-control")) setSpeedMenuOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !speedMenu.hidden) {
    setSpeedMenuOpen(false);
    playbackRateButton.focus();
  }
  if (event.key === "Escape" && !wordPopover.hidden) {
    const returnFocus = selectedWordButton;
    hideWordPopover();
    returnFocus?.focus();
  }
});

audio.addEventListener("play", () => {
  playIcon.innerHTML = PAUSE_ICON;
  playPause.setAttribute("aria-label", "Pause");
  tick();
});

audio.addEventListener("pause", () => {
  playIcon.innerHTML = PLAY_ICON;
  playPause.setAttribute("aria-label", "Play");
  cancelAnimationFrame(rafId);
  updateProgress();
});

audio.addEventListener("loadedmetadata", () => {
  seek.max = audio.duration || 0;
  seek.disabled = false;
  playPause.disabled = false;
  skipBack.disabled = false;
  skipForward.disabled = false;
  durationEl.textContent = formatTime(audio.duration);
  if (words.length && !hasValidTimings(words)) assignApproximateTimes(words);
  if (pendingResumeTime > 0 && audio.duration) {
    audio.currentTime = Math.min(pendingResumeTime, Math.max(0, audio.duration - 1));
    pendingResumeTime = 0;
  }
  drawWaveform(0);
  updateProgress();
});

audio.addEventListener("ended", () => {
  playIcon.innerHTML = PLAY_ICON;
  playPause.setAttribute("aria-label", "Play");
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
  setWordTabStop(target);
  showDefinition(words[Number(target.dataset.index)], target);
});

reader.addEventListener("keydown", (event) => {
  const target = event.target.closest(".word");
  if (!target || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
  event.preventDefault();
  const offset = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
  const next = reader.querySelector(`[data-index="${Number(target.dataset.index) + offset}"]`);
  if (next) {
    setWordTabStop(next);
    next.focus();
  }
});

document.addEventListener("click", (event) => {
  if (wordPopover.hidden) return;
  if (wordPopover.contains(event.target) || event.target.closest(".word")) return;
  hideWordPopover();
});

window.addEventListener("resize", () => {
  if (selectedWordButton && !wordPopover.hidden) positionWordPopover(selectedWordButton);
});

window.addEventListener("pagehide", () => saveActiveProgress(true));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveActiveProgress(true);
});

function setAudioSource(src, message) {
  audio.pause();
  words = [];
  reader.replaceChildren();
  hideWordPopover();
  definition.innerHTML = `<p class="muted">Tap a word for an English meaning.</p>`;
  audio.src = src;
  audio.playbackRate = appearanceSettings.playbackRate;
  audio.load();
  seek.value = "0";
  seek.max = "0";
  seek.disabled = true;
  playPause.disabled = true;
  skipBack.disabled = true;
  skipForward.disabled = true;
  currentTimeEl.textContent = "0:00";
  durationEl.textContent = "0:00";
  currentWordIndex = -1;
  readWordCount = -1;
  status(message);
}

async function loadLibrary() {
  try {
    const response = await fetch("library.json", { cache: "no-store" });
    if (!response.ok) throw new Error("No library");
    const library = await response.json();
    if (!Array.isArray(library)) throw new Error("Invalid library");
    tracks = library
      .filter((track) => track.audio || track.text || track.transcript)
      .map((track) => ({
        ...track,
        id: track.id || track.audio || track.text || track.transcript,
        title: track.title || track.audio || track.text || track.transcript,
        difficulty: difficultyOrder.includes(track.difficulty) ? track.difficulty : "C1",
        collection: track.collection === "bible" ? "bible" : "stories",
        minutes: Number(track.minutes) || 0
      }));
    renderTrackList();
  } catch {
    trackList.innerHTML = `<p class="muted">No hosted readings found. Add audio files and run <code>python3 scripts/build_library.py</code>.</p>`;
  }
}

async function initialize() {
  await Promise.all([loadLibrary(), loadSharedGlossary()]);
  const routeId = decodeURIComponent(location.hash.slice(1));
  const routeTrack = tracks.find((track) => track.id === routeId);
  if (routeTrack) await loadTrack(routeTrack, false);
}

async function loadSharedGlossary() {
  try {
    const response = await fetch("glossary/shared.json");
    if (!response.ok) return;
    const glossary = await response.json();
    if (glossary && typeof glossary === "object" && !Array.isArray(glossary)) sharedGlossary = glossary;
  } catch {
    sharedGlossary = {};
  }
}

async function loadTrack(track, updateHistory = true) {
  audio.pause();
  saveActiveProgress(true);
  const loadId = ++trackLoadId;
  activeTrackId = track.id;
  activeAudioSource = track.audio || "";
  pendingResumeTime = progressCache[activeTrackId]?.time || 0;
  appTitle.textContent = track.title;
  renderReadingMeta(track);
  showReader();
  if (updateHistory && location.hash.slice(1) !== encodeURIComponent(track.id)) {
    history.pushState({ trackId: track.id }, "", `#${encodeURIComponent(track.id)}`);
  }
  app.dataset.media = track.audio ? "audio" : "text";
  setReadMode(!track.audio);
  if (track.audio) {
    setAudioSource(track.audio, `${track.title} loaded.`);
  } else {
    clearAudioSource();
    status(`Opening ${track.title}…`);
  }
  renderTrackList();

  const transcriptPath = track.audio ? track.transcript : (track.text || track.transcript);
  if (!transcriptPath) {
    words = [];
    reader.replaceChildren();
    status(`${track.title} has no transcript yet.`);
    return;
  }

  try {
    const response = await fetch(transcriptPath);
    if (!response.ok) throw new Error("Transcript not found");
    const text = await response.text();
    if (loadId !== trackLoadId || activeTrackId !== track.id) return;
    const parsed = parseTranscript(track.text ? stripCatalogTextHeader(text, track) : text, transcriptPath);
    const precise = Boolean(track.audio) && hasValidTimings(parsed);
    setWords(parsed, precise);
    if (track.audio) {
      const resumeMessage = pendingResumeTime > 0 ? ` Resuming at ${formatTime(pendingResumeTime)}.` : "";
      status(`${track.title} loaded with ${parsed.length.toLocaleString()} synced words.${resumeMessage}`);
    } else {
      status(`${track.title} · ${parsed.length.toLocaleString()} words · about ${track.minutes || readingMinutes(parsed.length)} min to read.`);
    }
  } catch {
    if (loadId !== trackLoadId || activeTrackId !== track.id) return;
    status(`${track.title} loaded, but its transcript could not be loaded.`);
  }
}

function clearAudioSource() {
  activeTrackId && saveActiveProgress(true);
  audio.removeAttribute("src");
  audio.load();
  words = [];
  reader.replaceChildren();
  hideWordPopover();
  definition.innerHTML = `<p class="muted">Tap a word for an English meaning.</p>`;
  pendingResumeTime = 0;
  currentWordIndex = -1;
  readWordCount = -1;
  seek.value = "0";
  seek.max = "0";
  seek.disabled = true;
  playPause.disabled = true;
  skipBack.disabled = true;
  skipForward.disabled = true;
  currentTimeEl.textContent = "0:00";
  durationEl.textContent = "0:00";
  drawWaveform(0);
}

function showLibrary(updateHistory = true) {
  audio.pause();
  saveActiveProgress(true);
  app.dataset.view = "library";
  document.title = "Spanish Listening Reader";
  if (updateHistory && location.hash) {
    history.pushState({}, "", `${location.pathname}${location.search}`);
  }
  hideWordPopover();
  renderTrackList();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showReader() {
  app.dataset.view = "reader";
  document.title = appTitle.textContent ? `${appTitle.textContent} · Spanish Listening Reader` : "Spanish Listening Reader";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setReadMode(enabled) {
  isReadMode = enabled;
  app.dataset.mode = enabled ? "read" : "listen";
  readModeToggle.setAttribute("aria-pressed", String(enabled));
  readModeToggle.setAttribute("aria-label", enabled ? "Switch to listening mode" : "Switch to reading mode");
  readModeToggle.title = enabled ? "Listen with highlighting" : "Read without listening";
  if (readModeLabel) readModeLabel.textContent = enabled ? "" : "Read";
  if (enabled) audio.pause();
}

function renderReadingMeta(track) {
  readingMeta.replaceChildren();
  const facts = document.createElement("div");
  facts.className = "reading-facts";
  for (const value of [track.difficulty, track.author, track.genre, track.minutes ? `${track.minutes} min` : ""]) {
    if (!value) continue;
    const span = document.createElement("span");
    span.textContent = value;
    facts.append(span);
  }
  readingMeta.append(facts);
  if (track.difficultyNote) {
    const note = document.createElement("p");
    note.textContent = track.difficultyNote;
    readingMeta.append(note);
  }
  if (String(track.source || "").startsWith("https://")) {
    const source = document.createElement("a");
    source.href = track.source;
    source.target = "_blank";
    source.rel = "noreferrer";
    source.textContent = "Source & rights";
    source.title = track.rights || "Source edition";
    readingMeta.append(source);
  }
  readingMeta.hidden = false;
}

function renderTrackList() {
  trackList.replaceChildren();
  if (!tracks.length) {
    trackList.innerHTML = `<p class="muted">No hosted readings found.</p>`;
    catalogSummary.textContent = "No readings available";
    return;
  }

  const query = normalizeSearch(catalogSettings.search);
  const visibleTracks = tracks
    .filter((track) => {
      if (catalogSettings.collection !== "all" && track.collection !== catalogSettings.collection) return false;
      if (catalogSettings.level !== "all" && track.difficulty !== catalogSettings.level) return false;
      if (catalogSettings.format === "listen" && !track.audio) return false;
      if (catalogSettings.format === "read" && track.audio) return false;
      if (!query) return true;
      return normalizeSearch([
        track.title,
        track.author,
        track.genre,
        track.description,
        track.collection === "bible" ? "biblia bible" : "cuentos stories",
        ...(Array.isArray(track.tags) ? track.tags : [])
      ].filter(Boolean).join(" ")).includes(query);
    })
    .sort(compareTracks);

  const countLabel = `${visibleTracks.length.toLocaleString()} ${visibleTracks.length === 1 ? "reading" : "readings"}`;
  catalogSummary.textContent = visibleTracks.length === tracks.length ? countLabel : `${countLabel} of ${tracks.length}`;

  if (!visibleTracks.length) {
    trackList.innerHTML = `
      <div class="empty-catalog">
        <h2>No stories match</h2>
        <p>Try another title, format, or reading level.</p>
        <button type="button" data-clear-catalog>Clear filters</button>
      </div>`;
    return;
  }

  const groups = catalogSettings.sort === "difficulty"
    ? difficultyOrder.map((level) => [level, visibleTracks.filter((track) => track.difficulty === level)]).filter(([, items]) => items.length)
    : [["results", visibleTracks]];

  const fragment = document.createDocumentFragment();
  const showingDefaultCatalog = !query
    && catalogSettings.level === "all"
    && catalogSettings.collection === "all"
    && catalogSettings.format === "all"
    && catalogSettings.sort === "difficulty";
  const continueTracks = showingDefaultCatalog
    ? tracks
        .filter((track) => {
          const saved = progressCache[track.id];
          return track.audio && saved?.time > 0 && saved?.duration > 0 && saved.time / saved.duration < 0.97;
        })
        .sort((a, b) => Date.parse(progressCache[b.id].updatedAt || 0) - Date.parse(progressCache[a.id].updatedAt || 0))
        .slice(0, 3)
    : [];
  if (continueTracks.length) {
    const section = document.createElement("section");
    section.className = "continue-group";
    const heading = document.createElement("header");
    heading.className = "difficulty-heading";
    heading.innerHTML = `<div><h2>Continue listening</h2></div><p>Your latest ${continueTracks.length === 1 ? "story" : "stories"}</p>`;
    const grid = document.createElement("div");
    grid.className = "track-grid";
    for (const track of continueTracks) grid.append(createTrackCard(track));
    section.append(heading, grid);
    fragment.append(section);
  }
  for (const [level, groupTracks] of groups) {
    const section = document.createElement("section");
    section.className = "difficulty-group";
    if (level !== "results") {
      const heading = document.createElement("header");
      heading.className = "difficulty-heading";
      heading.innerHTML = `
        <div>
          <span class="level-mark">${escapeHtml(level)}</span>
          <h2>${escapeHtml(difficultyLabels[level])}</h2>
        </div>
        <p>${difficultyDescription(level)} · ${groupTracks.length} ${groupTracks.length === 1 ? "story" : "stories"}</p>`;
      section.append(heading);
    }
    const grid = document.createElement("div");
    grid.className = "track-grid";
    for (const track of groupTracks) grid.append(createTrackCard(track));
    section.append(grid);
    fragment.append(section);
  }
  trackList.append(fragment);
}

function createTrackCard(track) {
    const saved = progressCache[track.id] || {};
    const percent = saved.duration ? Math.min(100, Math.round((saved.time / saved.duration) * 100)) : 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `track-card${track.id === activeTrackId ? " active" : ""}`;
    button.dataset.trackId = track.id;
    if (track.id === activeTrackId) button.setAttribute("aria-current", "true");
    button.style.setProperty("--progress", `${percent}%`);
    const formatLabel = track.audio ? "Listen & read" : "Read";
    const timeLabel = track.minutes ? `${track.minutes} min` : "Short read";
    button.innerHTML = `
      <div class="track-cover-wrapper">
        <div class="track-cover" aria-hidden="true">
          ${track.cover
            ? `<img src="${escapeHtml(track.cover)}" alt="" width="848" height="1264" loading="lazy" decoding="async">`
            : `<div class="track-cover-placeholder"><span>${escapeHtml(track.title)}</span></div>`}
        </div>
        <span class="track-progress" aria-hidden="true"><span></span></span>
      </div>
      <div class="track-info">
        <span class="track-badges"><span class="level-badge">${escapeHtml(track.difficulty)}</span><span>${formatLabel}</span><span>${timeLabel}</span></span>
        <span class="track-title">${escapeHtml(track.title)}</span>
        ${track.author ? `<span class="track-author">${escapeHtml(track.author)}</span>` : ""}
        ${track.description ? `<span class="track-description">${escapeHtml(track.description)}</span>` : ""}
        <span class="track-progress-label">${track.audio ? progressLabel(saved) : "Ready to read"}</span>
      </div>
    `;
    const coverImage = button.querySelector(".track-cover img");
    coverImage?.addEventListener("error", () => {
      const placeholder = document.createElement("div");
      const title = document.createElement("span");
      placeholder.className = "track-cover-placeholder";
      title.textContent = track.title;
      placeholder.append(title);
      coverImage.parentElement?.replaceChildren(placeholder);
    }, { once: true });
    return button;
}

function compareTracks(a, b) {
  if (catalogSettings.sort === "length") return (a.minutes || 999) - (b.minutes || 999) || compareTitle(a, b);
  if (catalogSettings.sort === "author") return String(a.author || "").localeCompare(String(b.author || ""), "es") || compareTitle(a, b);
  if (catalogSettings.sort === "title") return compareTitle(a, b);
  return difficultyOrder.indexOf(a.difficulty) - difficultyOrder.indexOf(b.difficulty) || compareTitle(a, b);
}

function compareTitle(a, b) {
  return String(a.title).localeCompare(String(b.title), "es", { sensitivity: "base" });
}

function normalizeSearch(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

function difficultyDescription(level) {
  return {
    A2: "Brief, approachable language",
    B1: "Familiar narration with some literary vocabulary",
    B2: "Layered prose and a broader vocabulary",
    C1: "Dense, historical, or stylistically demanding"
  }[level] || "Unrated";
}

function readingMinutes(wordCount) {
  return Math.max(1, Math.round(Number(wordCount || 0) / 180));
}

function updateLevelFilters() {
  levelFilters.forEach((button) => {
    const selected = button.dataset.level === catalogSettings.level;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function selectCollection(collection) {
  catalogSettings.collection = ["all", "stories", "bible"].includes(collection) ? collection : "all";
  saveCatalogSettings();
  updateCollectionTabs();
  renderTrackList();
}

function updateCollectionTabs() {
  collectionTabs.forEach((button) => {
    const selected = button.dataset.collection === catalogSettings.collection;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected) trackList.setAttribute("aria-labelledby", button.id);
  });
}

function loadCatalogSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("reader-catalog-v1") || "{}");
    return {
      search: String(saved.search || ""),
      format: ["all", "listen", "read"].includes(saved.format) ? saved.format : "all",
      sort: ["difficulty", "title", "author", "length"].includes(saved.sort) ? saved.sort : "difficulty",
      level: ["all", ...difficultyOrder].includes(saved.level) ? saved.level : "all",
      collection: ["all", "stories", "bible"].includes(saved.collection) ? saved.collection : "all"
    };
  } catch {
    return { search: "", format: "all", sort: "difficulty", level: "all", collection: "all" };
  }
}

function saveCatalogSettings() {
  try {
    localStorage.setItem("reader-catalog-v1", JSON.stringify(catalogSettings));
  } catch {
    // Catalog preferences are optional when storage is unavailable.
  }
}

function setWords(nextWords, precise) {
  words = nextWords.map((word, index) => ({ ...word, index }));
  if (!precise) {
    words.forEach((word) => {
      word.start = Number.NaN;
      word.end = Number.NaN;
    });
    assignApproximateTimes(words);
  }
  currentWordIndex = -1;
  readWordCount = -1;
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

function stripCatalogTextHeader(text, track) {
  const lines = text.replace(/\r/g, "").split("\n");
  if (lines[0]?.trim() === track.title && lines[1]?.trim() === track.author && !lines[2]?.trim()) {
    return lines.slice(3).join("\n");
  }
  return text;
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
    span.tabIndex = index === 0 ? 0 : -1;
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
  seek.setAttribute("aria-valuetext", `${formatTime(current)} of ${formatTime(duration)}`);
  drawWaveform(duration ? current / duration : 0);
  updateCurrentWord(current);
  saveActiveProgress(false);
}

function updateCurrentWord(time) {
  if (!words.length) return;
  if (isReadMode) return;
  const index = findWordAt(time);
  const endedCount = countEndedWords(time);
  if (index === currentWordIndex && endedCount === readWordCount) return;
  if (currentWordIndex >= 0) reader.querySelector(`[data-index="${currentWordIndex}"]`)?.classList.remove("current");
  const firstChanged = Math.max(0, Math.min(readWordCount < 0 ? 0 : readWordCount, endedCount));
  const lastChanged = Math.max(readWordCount, endedCount);
  for (let wordIndex = firstChanged; wordIndex < lastChanged; wordIndex += 1) {
    reader.querySelector(`[data-index="${wordIndex}"]`)?.classList.toggle("read", wordIndex < endedCount);
  }
  currentWordIndex = index;
  readWordCount = endedCount;
  if (index >= 0) {
    const active = reader.querySelector(`[data-index="${index}"]`);
    active?.classList.add("current");
    active?.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
  }
}

function setWordTabStop(button) {
  reader.querySelector('.word[tabindex="0"]')?.setAttribute("tabindex", "-1");
  button.tabIndex = 0;
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
  return -1;
}

function countEndedWords(time) {
  let low = 0;
  let high = words.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (words[mid].end <= time) low = mid + 1;
    else high = mid;
  }
  return low;
}

async function showDefinition(word, anchor) {
  if (!word) return;
  selectedWordButton?.classList.remove("selected");
  selectedWordButton = anchor || null;
  selectedWordButton?.classList.add("selected");
  const requestId = ++definitionRequestId;
  
  const normalized = normalizeWord(word.text);
  const contextHTML = contextSentenceForWord(word.index);
  const instant = sharedGlossary[normalized] || getCachedTranslation(contextHTML);
  
  if (instant) {
    renderDefinition(contextHTML, instant, anchor, true);
    logStudiedWord(word, instant);
    return;
  }

  renderDefinition(contextHTML, "Looking up...", anchor, true);

  if (word.translation) {
    renderDefinition(contextHTML, word.translation, anchor, true);
    logStudiedWord(word, word.translation);
    return;
  }

  try {
    const translated = await fetchTranslation(contextHTML);
    if (requestId === definitionRequestId) {
      renderDefinition(contextHTML, translated, anchor, true);
      logStudiedWord(word, translated);
    }
  } catch {
    const spanishDict = `https://www.spanishdict.com/translate/${encodeURIComponent(normalized)}`;
    const wordReference = `https://www.wordreference.com/es/en/translation.asp?spen=${encodeURIComponent(normalized)}`;
    if (requestId !== definitionRequestId) return;
    const fallback = `No automatic result. <a href="${spanishDict}" target="_blank" rel="noreferrer">SpanishDict</a> or <a href="${wordReference}" target="_blank" rel="noreferrer">WordReference</a>.`;
    renderDefinition(contextHTML, fallback, anchor, "trusted");
  }
}

function renderDefinition(word, translation, anchor = selectedWordButton, allowHtml = false) {
  const wordHtml = allowHtml ? word : escapeHtml(word);
  const translationHtml = allowHtml === "trusted"
    ? translation
    : allowHtml
      ? sanitizeEmphasisHtml(translation)
      : escapeHtml(translation);
  const playFromHereBtn = `<button class="play-from-here" type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Play from here</button>`;
  const content = `
    <p class="definition-word">${wordHtml}</p>
    <p class="translation">${translationHtml}</p>
    ${playFromHereBtn}
  `;
  definition.innerHTML = content;
  wordPopover.innerHTML = content;
  wordPopover.hidden = false;
  if (anchor) positionWordPopover(anchor);

  const wirePlayFromHere = (container) => {
    const btn = container.querySelector(".play-from-here");
    if (!btn || !selectedWordButton) return;
    const wordIndex = Number(selectedWordButton.dataset.index);
    const wordData = words[wordIndex];
    if (!wordData || !Number.isFinite(wordData.start)) {
      btn.style.display = "none";
      return;
    }
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      audio.currentTime = wordData.start;
      if (isReadMode) {
        isReadMode = false;
        app.dataset.mode = "listen";
        if (readModeLabel) readModeLabel.textContent = "Read";
      }
      audio.play().catch(() => {});
      hideWordPopover();
    });
  };
  wirePlayFromHere(definition);
  wirePlayFromHere(wordPopover);
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
  const left = window.scrollX + Math.max(margin, Math.min(desiredLeft, window.innerWidth - width - margin));
  const aboveTop = rect.top - popoverRect.height - 10;
  const belowTop = rect.bottom + 10;
  const viewportTop = aboveTop >= margin ? aboveTop : Math.min(belowTop, window.innerHeight - popoverRect.height - margin);
  const top = window.scrollY + Math.max(margin, viewportTop);

  wordPopover.style.left = `${left}px`;
  wordPopover.style.top = `${top}px`;
  wordPopover.dataset.placement = aboveTop >= margin ? "above" : "below";
}

function hideWordPopover() {
  selectedWordButton?.classList.remove("selected");
  selectedWordButton = null;
  wordPopover.hidden = true;
}

function logStudiedWord(word, meaning) {
  if (!word || !meaning || /looking up/i.test(String(meaning))) return;
  const normalized = normalizeWord(word.text);
  if (!normalized) return;

  const context = contextSentenceForWord(word.index);
  const reading = appTitle.textContent || "Untitled reading";
  const contextText = htmlToText(context);
  const key = `${normalized}\u241f${reading}\u241f${contextText}`;
  const previous = studyLog[key] || {};
  studyLog[key] = {
    word: word.text,
    normalized,
    meaning: htmlToText(meaning),
    context,
    reading,
    firstSeenAt: previous.firstSeenAt || new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    lookupCount: (previous.lookupCount || 0) + 1
  };
  saveStudyLog(studyLog);
  updateStudyControls();
}

function contextSentenceForWord(index) {
  if (!Number.isFinite(index) || !words[index]) return "";
  let start = index;
  while (start > 0 && start > index - 3 && !endsSentence(words[start - 1])) start -= 1;

  let end = index;
  while (end < words.length - 1 && end < index + 1 && !endsSentence(words[end])) end += 1;

  return words
    .slice(start, end + 1)
    .map((word, offset) => {
      const absoluteIndex = start + offset;
      const text = absoluteIndex === index ? `<b>${escapeHtml(word.text)}</b>` : escapeHtml(word.text);
      return `${text}${escapeHtml(word.separator || " ")}`;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function endsSentence(word) {
  return /[.,:;!?…]["')\]]*\s*$/.test(`${word.text}${word.separator || ""}`);
}

function updateStudyControls() {
  const count = studyEntries().length;
  studyCount.textContent = `${count.toLocaleString()} looked-up ${count === 1 ? "word" : "words"}`;
  downloadAnki.disabled = count === 0;
}

function studyEntries() {
  return Object.entries(studyLog)
    .filter(([, entry]) => entry && typeof entry === "object")
    .sort(([, a], [, b]) => String(a.normalized || a.word).localeCompare(String(b.normalized || b.word), "es"));
}

function downloadableStudyEntries() {
  return studyEntries().filter(([, entry]) => String(entry.word || "").trim() && String(entry.meaning || "").trim());
}

function openAnkiReview() {
  const entries = studyEntries();
  if (!entries.length) return;
  audio.pause();
  ankiCardList.replaceChildren();

  const fragment = document.createDocumentFragment();
  for (const [key, entry] of entries) {
    const card = document.createElement("article");
    card.className = "anki-card-editor";
    card.dataset.studyKey = key;
    card.innerHTML = `
      <div class="anki-card-editor-header">
        <strong>${escapeHtml(entry.word || "Untitled word")}</strong>
        <button class="remove-card-button" type="button" data-remove-card aria-label="Remove ${escapeHtml(entry.word || "card")} from Anki export">Remove</button>
      </div>
      <div class="anki-card-fields">
        <label>
          <span>Clicked word</span>
          <input data-field="word" value="${escapeHtml(entry.word || "")}">
        </label>
        <label>
          <span>Translated phrase</span>
          <textarea data-field="meaning" rows="2">${escapeHtml(entry.meaning || "")}</textarea>
        </label>
        <label>
          <span>Spanish context</span>
          <textarea data-field="context" rows="2">${escapeHtml(htmlToText(entry.context))}</textarea>
        </label>
        <label>
          <span>Reading</span>
          <input data-field="reading" value="${escapeHtml(entry.reading || "")}">
        </label>
      </div>
    `;
    fragment.append(card);
  }
  ankiCardList.append(fragment);
  updateAnkiReviewCount();
  ankiDialog.showModal();
}

function updateAnkiReviewCount() {
  const count = studyEntries().length;
  const readyCount = downloadableStudyEntries().length;
  ankiDialogCount.textContent = `${count.toLocaleString()} ${count === 1 ? "card" : "cards"} saved · ${readyCount.toLocaleString()} ready to download`;
  downloadReviewedAnki.disabled = readyCount === 0;
}

function downloadAnkiCards() {
  const entries = downloadableStudyEntries().map(([, entry]) => entry);
  if (!entries.length) return;

  const rows = entries.map((entry) => [
    entry.word,
    entry.meaning,
    entry.context,
    entry.reading
  ].map(tsvField).join("\t"));
  const blob = new Blob([`${rows.join("\n")}\n`], {
    type: "text/tab-separated-values;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `spanish-reader-anki-${new Date().toISOString().slice(0, 10)}.tsv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function tsvField(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, "<br>")
    .replace(/\t/g, " ")
    .trim();
}

function getCachedTranslation(context) {
  return translationCache[context] || "";
}

async function fetchTranslation(context) {
  const cached = getCachedTranslation(context);
  if (cached) return cached;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 4500);
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(context)}&langpair=es|en`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("Lookup failed");
    const data = await response.json();
    const translated = data?.responseData?.translatedText;
    if (!translated) throw new Error("No translation returned");
    translationCache[context] = translated;
    saveTranslationCache(translationCache);
    return translated;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function drawWaveform(progress) {
  const width = canvas.width;
  const height = canvas.height;
  const styles = getComputedStyle(document.documentElement);
  const waveBg = styles.getPropertyValue("--wave-bg").trim() || "#eef3f1";
  const waveDone = styles.getPropertyValue("--wave-done").trim() || "#315fba";
  const waveRest = styles.getPropertyValue("--wave-rest").trim() || "#b8c7c2";
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = waveBg;
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
    ctx.fillStyle = phase <= progress ? waveDone : waveRest;
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

function hasValidTimings(list) {
  let previousStart = -Infinity;
  let previousEnd = -Infinity;
  return list.length > 0 && list.every((word) => {
    const valid = Number.isFinite(word.start)
      && Number.isFinite(word.end)
      && word.start >= previousStart
      && word.end >= previousEnd
      && word.end >= word.start;
    previousStart = word.start;
    previousEnd = word.end;
    return valid;
  });
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
  if (app.dataset.media !== "audio" || !activeTrackId || !audio.duration || !Number.isFinite(audio.duration)) return;
  const expectedSource = activeAudioSource ? new URL(activeAudioSource, document.baseURI).href : "";
  if (!expectedSource || audio.currentSrc !== expectedSource) return;
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
  if (app.dataset.view === "library") renderTrackList();
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

function sanitizeEmphasisHtml(value) {
  const template = document.createElement("template");
  template.innerHTML = String(value);

  const sanitizeNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || "");
    const fragment = document.createDocumentFragment();
    for (const child of node.childNodes) fragment.append(sanitizeNode(child));
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "B") {
      const bold = document.createElement("b");
      bold.append(fragment);
      return bold;
    }
    return fragment;
  };

  const container = document.createElement("div");
  for (const child of template.content.childNodes) container.append(sanitizeNode(child));
  return container.innerHTML;
}

function htmlToText(value) {
  const template = document.createElement("template");
  template.innerHTML = String(value ?? "");
  return (template.content.textContent || "").replace(/\s+/g, " ").trim();
}

function status(message) {
  statusEl.textContent = message;
}

function updateSpeedButton(rate) {
  const label = formatPlaybackRate(rate);
  playbackRateValue.textContent = label;
  playbackRateButton.setAttribute("aria-label", `Playback speed: ${rate} times`);
  speedOptions.forEach((option) => {
    const isSelected = Number(option.dataset.rate) === rate;
    option.classList.toggle("is-selected", isSelected);
    option.setAttribute("aria-checked", String(isSelected));
  });
}

function formatPlaybackRate(rate) {
  if (rate === 1 || rate === 2) return `${rate}×`;
  return `${rate.toFixed(2)}×`;
}

function setPlaybackRate(rate) {
  audio.playbackRate = rate;
  appearanceSettings.playbackRate = rate;
  saveAppearanceSettings(appearanceSettings);
  updateSpeedButton(rate);
}

function setSpeedMenuOpen(isOpen) {
  speedMenu.hidden = !isOpen;
  playbackRateButton.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) {
    speedMenu.querySelector(".is-selected")?.focus();
  }
}

function loadTranslationCache() {
  try {
    return JSON.parse(localStorage.getItem("spanish-reader-translations") || "{}");
  } catch {
    return {};
  }
}

function saveTranslationCache(cache) {
  safeSetLocalStorage("spanish-reader-translations", cache);
}

function loadProgressCache() {
  try {
    return JSON.parse(localStorage.getItem("spanish-reader-progress") || "{}");
  } catch {
    return {};
  }
}

function saveProgressCache(cache) {
  safeSetLocalStorage("spanish-reader-progress", cache);
}

function loadStudyLog() {
  try {
    return JSON.parse(localStorage.getItem("spanish-reader-study-log") || "{}");
  } catch {
    return {};
  }
}

function saveStudyLog(log) {
  safeSetLocalStorage("spanish-reader-study-log", log);
}

function loadAppearanceSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("spanish-reader-appearance") || "{}");
    const defaults = defaultAppearanceSettings();
    return {
      theme: themeOptions.includes(saved.theme) ? saved.theme : defaults.theme,
      highlight: ["sage", "sky", "rose", "underline", "none"].includes(saved.highlight) ? saved.highlight : defaults.highlight,
      textMode: ["dim-passed", "dim-upcoming"].includes(saved.textMode) ? saved.textMode : defaults.textMode,
      textSize: numberInRange(saved.textSize, 80, 140, defaults.textSize),
      lineHeight: numberInRange(saved.lineHeight, 1.4, 2.2, defaults.lineHeight),
      font: ["serif", "sans", "accessible"].includes(saved.font) ? saved.font : defaults.font,
      readerWidth: ["narrow", "standard", "wide"].includes(saved.readerWidth) ? saved.readerWidth : defaults.readerWidth,
      playbackRate: SPEED_RATES.includes(Number(saved.playbackRate)) ? Number(saved.playbackRate) : defaults.playbackRate
    };
  } catch {
    return defaultAppearanceSettings();
  }
}

function defaultAppearanceSettings() {
  return {
    theme: "system",
    highlight: "sage",
    textMode: "dim-passed",
    textSize: 100,
    lineHeight: 1.8,
    font: "serif",
    readerWidth: "standard",
    playbackRate: 1
  };
}

function numberInRange(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
}

function saveAppearanceSettings(settings) {
  safeSetLocalStorage("spanish-reader-appearance", {
    ...settings,
    version: appearanceSettingsVersion
  });
}

function safeSetLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Reading remains usable in private mode or when storage is full.
  }
}

function applyAppearanceSettings() {
  document.documentElement.dataset.theme = resolveTheme(appearanceSettings.theme);
  document.documentElement.dataset.highlight = appearanceSettings.highlight;
  document.documentElement.dataset.textMode = appearanceSettings.textMode;
  document.documentElement.dataset.readerFont = appearanceSettings.font;
  document.documentElement.dataset.readerWidth = appearanceSettings.readerWidth;
  document.documentElement.style.setProperty("--reader-font-size", `${1.6 * appearanceSettings.textSize / 100}rem`);
  document.documentElement.style.setProperty("--reader-line-height", appearanceSettings.lineHeight);
  themeSelect.value = appearanceSettings.theme;
  highlightSelect.value = appearanceSettings.highlight;
  textModeSelect.value = appearanceSettings.textMode;
  textSize.value = appearanceSettings.textSize;
  textSizeValue.value = `${appearanceSettings.textSize}%`;
  lineHeight.value = appearanceSettings.lineHeight;
  lineHeightValue.value = appearanceSettings.lineHeight.toFixed(1);
  fontSelect.value = appearanceSettings.font;
  readerWidthSelect.value = appearanceSettings.readerWidth;
  updateSpeedButton(appearanceSettings.playbackRate);
  audio.playbackRate = appearanceSettings.playbackRate;
  drawWaveform(audio.duration ? (audio.currentTime || 0) / audio.duration : 0);
}

function resolveTheme(theme) {
  if (theme === "system") {
    return systemThemeQuery?.matches ? "night" : "paper";
  }
  return theme;
}
