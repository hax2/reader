import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

// Run the real hook with synchronous speech events and deferred React renders.
const slots = [];
let cursor = 0;
let effects = [];
const timers = new Map();
let timerId = 0;
let spoken;
const changes = [];
const context = {
  useState(initial) {
    const i = cursor++;
    if (!(i in slots)) slots[i] = initial;
    return [slots[i], value => { slots[i] = value; }];
  },
  useRef(initial) {
    const i = cursor++;
    return slots[i] ??= { current: initial };
  },
  useCallback: fn => fn,
  useEffect: fn => effects.push(fn),
  speechSynthesisSupported: true,
  setMediaSessionPlaybackState() {},
  SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
  window: {
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    setInterval() { return 0; },
    speechSynthesis: {
      getVoices: () => [], cancel() {}, resume() {},
      speak(utterance) { spoken = utterance; utterance.onstart(); }
    }
  }
};
let source = await fs.readFile(new URL('../src/hooks/useBrowserTts.ts', import.meta.url), 'utf8');
source = source.replace(/^import .*;\n/gm, '').replace(/export /g, '');
const { code } = await transformWithOxc(source, 'useBrowserTts.ts');
vm.createContext(context);
vm.runInContext(code + '\nthis.hook = useBrowserTts;', context);
const words = ['Uno', 'dos', 'tres', 'cuatro'].map(text => ({ text, separator: ' ' }));
function render() {
  cursor = 0;
  effects = [];
  return context.hook({ words, appearanceSettings: { playbackRate: 1 },
    readerRef: { current: null }, onWordChange: index => changes.push(index) });
}
function advance() {
  const entry = timers.entries().next().value;
  assert.ok(entry, 'fallback highlighting must schedule a timer');
  timers.delete(entry[0]);
  entry[1]();
}
let hook = render();
// Build chunks; voice discovery and keepalive are irrelevant to this regression.
effects[2]();
hook = render();
hook.speakTextFromWord(0);
advance();
assert.equal(changes.at(-1), 1);
hook = render();
hook.pauseTextToSpeech();
const canceled = spoken;
hook = render();
hook.toggleTextToSpeech();
assert.equal(changes.at(-1), 1, 'resume retains position');
advance();
assert.equal(changes.at(-1), 2, 'highlight advances after resume');
canceled.onboundary({ charIndex: 0, name: 'word' });
assert.equal(changes.at(-1), 2, 'canceled speech cannot move the highlight');
hook = render();
hook.stopTextToSpeech();
hook = render();
hook.toggleTextToSpeech();
advance();
assert.equal(changes.at(-1), 1, 'highlight advances after stop/start');
console.log('Browser TTS start, pause/resume, stop/start, and stale event checks passed.');
