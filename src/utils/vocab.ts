import { normalizeWord, escapeHtml } from "./text";
import { isInvalidTranslationResponse, fetchGoogleGtxTranslation, fetchTranslation } from "./translations";
import type { WordToken } from "../types";

export const SPANISH_IDIOMS = [
  { phrase: "de repente", meaning: "suddenly, all of a sudden" },
  { phrase: "sin embargo", meaning: "however, nevertheless" },
  { phrase: "poco a poco", meaning: "little by little, gradually" },
  { phrase: "por fin", meaning: "finally, at last" },
  { phrase: "a menudo", meaning: "often, frequently" },
  { phrase: "a través de", meaning: "through, across" },
  { phrase: "darse cuenta", meaning: "to realize, become aware" },
  { phrase: "echar de menos", meaning: "to miss (someone/something)" },
  { phrase: "tener en cuenta", meaning: "to take into account" },
  { phrase: "a punto de", meaning: "on the verge of, about to" },
  { phrase: "en medio de", meaning: "in the middle of, amid" },
  { phrase: "de vez en cuando", meaning: "from time to time" },
  { phrase: "al fin y al cabo", meaning: "after all, in the end" },
  { phrase: "por lo tanto", meaning: "therefore, consequently" },
  { phrase: "hacer caso", meaning: "to pay attention, to heed" },
  { phrase: "tener lugar", meaning: "to take place, to happen" },
  { phrase: "valer la pena", meaning: "to be worth the effort" },
  { phrase: "llevar a cabo", meaning: "to carry out, execute" },
  { phrase: "a pesar de", meaning: "despite, in spite of" },
  { phrase: "en cambio", meaning: "on the other hand, instead" },
  { phrase: "de nuevo", meaning: "again, once more" },
  { phrase: "al principio", meaning: "at first, in the beginning" }
];

export const HIGH_FREQ_SPANISH = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "este", "esta", "estos", "estas",
  "ese", "esa", "esos", "esas", "aquel", "aquella", "aquellos", "aquellas", "mi", "mis",
  "tu", "tus", "su", "sus", "nuestro", "nuestra", "nuestros", "nuestras", "vuestro", "vuestra",
  "yo", "tu", "tú", "el", "él", "ella", "ellos", "ellas", "nosotros", "nosotras", "vosotros",
  "usted", "ustedes", "me", "te", "se", "nos", "os", "le", "les", "lo", "la", "los", "las",
  "que", "qué", "quien", "quién", "quienes", "quiénes", "cual", "cuál", "cuales", "cuáles",
  "algo", "nada", "alguien", "nadie", "alguno", "alguna", "algunos", "algunas", "ninguno", "ninguna",
  "todo", "toda", "todos", "todas", "otro", "otra", "otros", "otras", "mismo", "misma", "mismos",
  "a", "al", "del", "de", "en", "con", "por", "para", "sin", "sobre", "entre", "hasta", "desde",
  "hacia", "contra", "tras", "bajo", "ante", "según", "y", "e", "o", "u", "ni", "pero", "sino",
  "porque", "pues", "aunque", "como", "si", "cuando", "donde", "dónde", "mientras", "así",
  "no", "si", "sí", "ya", "muy", "más", "menos", "tan", "tanto", "tanta", "tantos", "tantas",
  "bien", "mal", "aquí", "allí", "ahí", "acá", "allá", "ahora", "luego", "después", "antes",
  "siempre", "nunca", "jamás", "hoy", "ayer", "mañana", "casi", "solo", "sólo", "solamente",
  "también", "tampoco", "quizá", "quizás", "tal", "vez", "veces", "demasiado", "mucho", "mucha",
  "muchos", "muchas", "poco", "poca", "pocos", "pocas",
  "ser", "es", "son", "era", "eran", "fue", "fueron", "sea", "sean", "siendo", "sido", "somos", "eres",
  "estar", "está", "están", "estaba", "estaban", "estuvo", "estuvieron", "esté", "estén", "estado", "estamos", "estás",
  "haber", "hay", "había", "habían", "hubo", "hubieron", "haya", "hayan", "habido", "he", "has", "ha", "hemos", "han",
  "tener", "tiene", "tienen", "tenía", "tenían", "tuvo", "tuvieron", "tenga", "tengan", "tenido", "tenemos", "tienes",
  "hacer", "hace", "hacen", "hacía", "hacían", "hizo", "hicieron", "haga", "hagan", "hecho", "hacemos", "haces",
  "ir", "va", "van", "iba", "iban", "fue", "fueron", "vaya", "vayan", "ido", "vamos", "vas",
  "decir", "dice", "dicen", "decía", "decían", "dijo", "dijeron", "diga", "digan", "dicho", "decimos", "dices",
  "ver", "ve", "ven", "veía", "veían", "vio", "vieron", "vea", "vean", "visto", "vemos", "ves",
  "dar", "da", "dan", "daba", "daban", "dio", "dieron", "dé", "den", "dado", "damos", "das",
  "poder", "puede", "pueden", "podía", "podían", "pudo", "pudieron", "pueda", "puedan", "podido", "podemos", "puedes",
  "saber", "sabe", "saben", "sabía", "sabían", "supo", "supieron", "sepa", "sepan", "sabido", "sabemos", "sabes",
  "querer", "quiere", "quieren", "quería", "querían", "quiso", "quisieron", "quiera", "querido", "queremos", "quieres",
  "llegar", "llega", "llegan", "llegaba", "llegó", "llegaron",
  "pasar", "pasa", "pasan", "pasaba", "pasó", "pasaron",
  "deber", "debe", "deben", "debía", "debió",
  "poner", "pone", "ponen", "ponía", "puso", "pusieron", "puesto",
  "parecer", "parece", "parecen", "parecía", "pareció",
  "quedar", "queda", "quedan", "quedaba", "quedó", "quedaron",
  "creer", "cree", "creen", "creía", "creyó",
  "hablar", "habla", "hablan", "hablaba", "habló",
  "llevar", "lleva", "llevan", "llevaba", "llevó",
  "dejar", "deja", "dejan", "dejaba", "dejó",
  "seguir", "sigue", "siguen", "seguía", "siguió",
  "encontrar", "encuentra", "encuentran", "encontraba", "encontró",
  "llamar", "llama", "llaman", "llamaba", "llamó",
  "venir", "viene", "vienen", "venía", "vino", "vinieron",
  "pensar", "piensa", "piensan", "pensaba", "pensó",
  "salir", "sale", "salen", "salía", "salió", "salieron",
  "volver", "vuelve", "vuelven", "volvía", "volvió", "vuelto",
  "tomar", "toma", "toman", "tomaba", "tomó",
  "conocer", "conoce", "conocen", "conocía", "conoció",
  "vivir", "vive", "viven", "vivía", "vivió",
  "sentir", "siente", "sienten", "sentía", "sintió",
  "tratar", "trata", "tratan", "trataba", "trató",
  "mirar", "mira", "miran", "miraba", "miró",
  "contar", "cuenta", "cuentan", "contaba", "contó",
  "empezar", "empieza", "empiezan", "empezaba", "empezó",
  "esperar", "espera", "esperan", "esperaba", "esperó",
  "buscar", "busca", "buscan", "buscaba", "buscó",
  "entrar", "entra", "entran", "entraba", "entró",
  "escribir", "escribe", "escriben", "escribía", "escribió", "escrito",
  "perder", "pierde", "pierden", "perdía", "perdió", "perdido",
  "cosa", "cosas", "año", "años", "día", "días", "tiempo", "tiempos", "hombre", "hombres",
  "mujer", "mujeres", "vida", "vidas", "momento", "momentos", "forma", "formas", "casa", "casas",
  "mundo", "mundos", "lugar", "lugares", "caso", "casos", "mano", "manos", "parte", "partes",
  "lado", "lados", "palabra", "palabras", "noche", "noches", "padre", "madre", "hijo", "hija",
  "ojos", "cabeza", "cuerpo", "voz", "camino", "hora", "horas", "persona", "personas"
]);

export const LITERARY_VOCAB_MAP: Record<string, string> = {
  lisonjas: "flattery, excessive praise",
  lisonja: "flattery, flattering compliment",
  lisonjear: "to flatter, praise insincerely",
  digiero: "I digest, I assimilate",
  digerir: "to digest, to assimilate",
  azabache: "jet-black, pitch-black",
  escarabajo: "beetle",
  escarabajos: "beetles",
  algodón: "cotton",
  cuervo: "crow, raven",
  astuto: "cunning, crafty, shrewd",
  astuta: "cunning, crafty, shrewd",
  adulación: "adulation, brown-nosing",
  adulador: "flatterer, sycophant",
  aduladores: "flatterers, sycophants",
  queso: "cheese",
  pico: "beak, bill (of a bird)",
  hazaña: "deed, heroic feat",
  hazañas: "deeds, heroic feats",
  soberbia: "pride, arrogance",
  soberbio: "proud, arrogant, splendid",
  vano: "vain, futile, empty",
  vana: "vain, futile, empty",
  donoso: "graceful, witty, charming",
  caverna: "cave, cavern",
  morada: "dwelling, abode, residence",
  cautivo: "captive, prisoner",
  cautivos: "captives, prisoners",
  tinieblas: "darkness, deep gloom",
  resplandor: "brightness, radiance, glow",
  desdicha: "misfortune, unhappiness",
  desvelo: "sleeplessness, care, concern",
  recelo: "suspicion, misgiving, distrust",
  alboroto: "commotion, uproar, fuss",
  antorcha: "torch",
  manantial: "spring, water source",
  penumbra: "semi-darkness, twilight",
  rocío: "dew",
  sendero: "path, trail, footpath",
  susurro: "whisper, rustle, murmur",
  torbellino: "whirlwind, vortex",
  crepúsculo: "twilight, dusk",
  estremecimiento: "shiver, shudder, tremor",
  semblante: "countenance, expression",
  tenue: "faint, delicate, subtle",
  umbrío: "shady, shadowy",
  yerto: "stiff, rigid, frozen",
  efímero: "ephemeral, short-lived",
  lúgubre: "gloomy, dismal, mournful",
  vislumbrar: "to catch a glimpse of",
  zalamería: "fawning, sweet talk"
};

let sharedGlossary: Record<string, string> = {};

export async function loadSharedGlossary(): Promise<Record<string, string>> {
  try {
    const response = await fetch("glossary/shared.json");
    if (!response.ok) return {};
    const glossary = await response.json();
    if (glossary && typeof glossary === "object" && !Array.isArray(glossary)) {
      sharedGlossary = glossary;
      return glossary;
    }
    return {};
  } catch {
    sharedGlossary = {};
    return {};
  }
}

export function getSharedGlossary(): Record<string, string> {
  return sharedGlossary;
}

export function extractShortContext(wordsList: WordToken[], wordIndex: number, targetWord: string): string {
  if (!wordsList || !wordsList[wordIndex]) return "";
  const start = Math.max(0, wordIndex - 3);
  const end = Math.min(wordsList.length - 1, wordIndex + 3);

  return wordsList
    .slice(start, end + 1)
    .map((w) => {
      const isMatch =
        normalizeWord(w.text) === normalizeWord(targetWord) ||
        (targetWord.includes(" ") && targetWord.toLowerCase().includes(w.text.toLowerCase()));
      return isMatch ? `<mark class="vocab-highlight">${escapeHtml(w.text)}</mark>` : escapeHtml(w.text);
    })
    .join(" ");
}

export async function fetchSingleWordMeaning(word: string): Promise<string> {
  const norm = normalizeWord(word);
  if (LITERARY_VOCAB_MAP[norm]) return LITERARY_VOCAB_MAP[norm];
  if (sharedGlossary[norm] && sharedGlossary[norm].trim()) return sharedGlossary[norm].trim();

  try {
    let raw = "";
    try {
      raw = await fetchGoogleGtxTranslation(norm, { dictionary: true });
    } catch {
      raw = await fetchTranslation(norm);
    }
    if (!raw || isInvalidTranslationResponse(raw)) return "";
    const clean = String(raw)
      .replace(/<[^>]+>/g, "")
      .replace(/&[a-z]+;/gi, " ")
      .trim();
    if (clean.length > 50) {
      return clean.slice(0, 45).trim() + "…";
    }
    return clean;
  } catch {
    return "";
  }
}

export interface VocabCandidate {
  word: string;
  normalized: string;
  displayWord: string;
  meaning: string;
  frequency: number;
  index: number;
  contextSentence: string;
  isPhrase: boolean;
  score: number;
}

export function extractUncommonVocab(wordsList: WordToken[]): VocabCandidate[] {
  if (!wordsList || wordsList.length < 15) return [];

  const fullTextLower = wordsList.map((w) => normalizeWord(w.text)).join(" ");
  const extracted: VocabCandidate[] = [];
  const seenWords = new Set<string>();

  // 1. Detect key multi-word idioms in the text
  for (const idiom of SPANISH_IDIOMS) {
    const idiomNorm = idiom.phrase.toLowerCase();
    const pos = fullTextLower.indexOf(idiomNorm);
    if (pos !== -1) {
      const approxIdx = Math.max(
        0,
        wordsList.findIndex((w) => fullTextLower.slice(0, pos).trim().split(/\s+/).length <= w.index)
      );
      const shortContext = extractShortContext(wordsList, approxIdx >= 0 ? approxIdx : 0, idiom.phrase);
      extracted.push({
        word: idiom.phrase,
        normalized: idiomNorm,
        displayWord: idiom.phrase,
        meaning: idiom.meaning,
        frequency: 1,
        index: approxIdx >= 0 ? approxIdx : 0,
        contextSentence: shortContext,
        isPhrase: true,
        score: 95
      });
      idiom.phrase.split(/\s+/).forEach((part) => seenWords.add(normalizeWord(part)));
    }
  }

  // 2. Frequency counting and candidate gathering
  const wordOccurrences = new Map<
    string,
    { word: string; normalized: string; count: number; firstIndex: number }
  >();
  wordsList.forEach((wordObj, index) => {
    const raw = wordObj.text.trim();
    const clean = normalizeWord(raw);
    if (!clean || clean.length < 4 || /^\d+$/.test(clean)) return;
    if (HIGH_FREQ_SPANISH.has(clean) || seenWords.has(clean)) return;

    if (!wordOccurrences.has(clean)) {
      wordOccurrences.set(clean, {
        word: raw.replace(/[.,;:!?¡¿"()«»]/g, ""),
        normalized: clean,
        count: 0,
        firstIndex: index
      });
    }
    wordOccurrences.get(clean)!.count += 1;
  });

  // 3. Scoring words by rarity & learner utility
  const candidates: {
    word: string;
    normalized: string;
    count: number;
    firstIndex: number;
    score: number;
    hasKnownDef: boolean;
  }[] = [];

  for (const [norm, data] of wordOccurrences.entries()) {
    let score = 0;
    const length = norm.length;
    score += Math.min(length * 2.5, 25);

    if (data.count === 1) score += 14;
    else if (data.count === 2) score += 20;
    else if (data.count === 3) score += 16;
    else if (data.count <= 6) score += 10;
    else score += 4;

    const hasKnownDef = Boolean(
      LITERARY_VOCAB_MAP[norm] || (sharedGlossary[norm] && sharedGlossary[norm].trim())
    );
    if (hasKnownDef) score += 35;

    if (/(?:eza|ura|umbre|miento|oso|osa|able|ible|ivo|iva|ante|iente|ero|era|ista)$/.test(norm)) {
      score += 10;
    }

    candidates.push({ ...data, score, hasKnownDef });
  }

  candidates.sort((a, b) => b.score - a.score);

  const maxWords = Math.min(6, Math.max(3, 8 - extracted.length));
  const selected = candidates.slice(0, maxWords);

  for (const cand of selected) {
    const shortContext = extractShortContext(wordsList, cand.firstIndex, cand.word);
    const meaning =
      LITERARY_VOCAB_MAP[cand.normalized] ||
      (sharedGlossary[cand.normalized] ? sharedGlossary[cand.normalized].trim() : "");

    extracted.push({
      word: cand.word,
      normalized: cand.normalized,
      displayWord: cand.word,
      meaning: meaning,
      frequency: cand.count,
      index: cand.firstIndex,
      contextSentence: shortContext,
      isPhrase: false,
      score: cand.score
    });
  }

  return extracted;
}
