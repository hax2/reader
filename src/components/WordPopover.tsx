import React, { useEffect, useRef, useState, useCallback } from "react";
import { normalizeWord, escapeHtml, sanitizeEmphasisHtml, htmlToText } from "../utils/text";
import {
  fetchSingleWordMeaning,
  getSharedGlossary,
  LITERARY_VOCAB_MAP
} from "../utils/vocab";
import {
  getCachedTranslation,
  fetchGoogleGtxTranslation,
  fetchTranslation
} from "../utils/translations";
import { contextSentenceForWord, contextualRequestForWord } from "../utils/storage";
import { speechSynthesisSupported } from "../utils/constants";
import { pronounceSpanishWord } from "../hooks/useBrowserTts";
import type { WordToken, StudyLog } from "../types";

export interface SideDefinition {
  wordText: string;
  wordIndex: number;
  wordHtml: string;
  meaningHtml: string;
}

export interface WordPopoverProps {
  selectedWord: WordToken | null;
  anchorEl: HTMLButtonElement | null;
  words: WordToken[];
  media: "audio" | "text";
  hasAudioSource?: boolean;
  preferredVoiceURI?: string;
  studyLog?: StudyLog;
  onClose: () => void;
  onPlayFromHere: (wordIndex: number) => void;
  onLogWord: (word: WordToken, meaning: string) => void;
  onUnlogWord?: (word: WordToken) => void;
  onUpdateSideDefinition?: (def: SideDefinition) => void;
}

export const WordPopover: React.FC<WordPopoverProps> = ({
  selectedWord,
  anchorEl,
  words,
  media,
  hasAudioSource = true,
  preferredVoiceURI,
  studyLog,
  onClose,
  onPlayFromHere,
  onLogWord,
  onUnlogWord,
  onUpdateSideDefinition
}) => {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [definition, setDefinition] = useState<string>("Looking up...");
  const [contextHTML, setContextHTML] = useState<string>("");
  const [allowHtml, setAllowHtml] = useState<boolean | "trusted">(false);
  const [coords, setCoords] = useState<{ left: number; top: number; width: number; placement: "above" | "below" }>({
    left: 0,
    top: 0,
    width: 300,
    placement: "below"
  });

  const updatePosition = useCallback(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(320, window.innerWidth - margin * 2);
    const desiredLeft = rect.left + rect.width / 2 - width / 2;
    const left = window.scrollX + Math.max(margin, Math.min(desiredLeft, window.innerWidth - width - margin));
    const popoverHeight = popoverRef.current?.getBoundingClientRect().height || 140;
    const aboveTop = rect.top - popoverHeight - 10;
    const belowTop = rect.bottom + 10;
    const isAbove = aboveTop >= margin;
    const top = window.scrollY + Math.max(margin, isAbove ? aboveTop : Math.min(belowTop, window.innerHeight - popoverHeight - margin));
    setCoords({ left, top, width, placement: isAbove ? "above" : "below" });
  }, [anchorEl]);

  useEffect(() => {
    if (!selectedWord || !anchorEl) return;

    updatePosition();

    const context = contextSentenceForWord(selectedWord.index, words);
    const wordHtml = context || escapeHtml(selectedWord.text);
    setContextHTML(wordHtml);
    const contextPlain = htmlToText(context);
    const contextualRequest = contextualRequestForWord(selectedWord.index, context, words);
    const normalized = normalizeWord(selectedWord.text);
    const shared = getSharedGlossary();
    const glossaryEntry = (shared[normalized] && shared[normalized].trim()) || LITERARY_VOCAB_MAP[normalized] || "";
    const instant = glossaryEntry || getCachedTranslation(contextualRequest) || getCachedTranslation(contextPlain);

    if (instant) {
      setDefinition(instant);
      setAllowHtml(true);
      onUpdateSideDefinition?.({
        wordText: selectedWord.text,
        wordIndex: selectedWord.index,
        wordHtml,
        meaningHtml: sanitizeEmphasisHtml(instant)
      });
      onLogWord(selectedWord, instant);
      return;
    }

    setDefinition("Looking up...");
    setAllowHtml(false);
    onUpdateSideDefinition?.({
      wordText: selectedWord.text,
      wordIndex: selectedWord.index,
      wordHtml,
      meaningHtml: escapeHtml("Looking up...")
    });

    let isCurrent = true;

    Promise.all([
      normalized ? fetchSingleWordMeaning(normalized).catch(() => "") : Promise.resolve(""),
      fetchGoogleGtxTranslation(contextPlain).catch(() => "")
    ])
      .then(async ([wordMeaning, phraseMeaning]) => {
        if (!isCurrent) return;
        let translated = "";
        if (wordMeaning && phraseMeaning && normalizeWord(wordMeaning) !== normalizeWord(phraseMeaning)) {
          translated = `<b>${escapeHtml(wordMeaning)}</b> — ${escapeHtml(phraseMeaning)}`;
        } else if (phraseMeaning || wordMeaning) {
          translated = escapeHtml(phraseMeaning || wordMeaning);
        } else {
          translated = await fetchTranslation(contextualRequest, {
            targetTag: "i",
            fallbackText: contextPlain
          });
        }
        if (isCurrent && translated) {
          setDefinition(translated);
          setAllowHtml(true);
          onUpdateSideDefinition?.({
            wordText: selectedWord.text,
            wordIndex: selectedWord.index,
            wordHtml,
            meaningHtml: sanitizeEmphasisHtml(translated)
          });
          onLogWord(selectedWord, translated);
        }
      })
      .catch(() => {
        if (!isCurrent) return;
        const spanishDict = `https://www.spanishdict.com/translate/${encodeURIComponent(normalized)}`;
        const wordReference = `https://www.wordreference.com/es/en/translation.asp?spen=${encodeURIComponent(normalized)}`;
        const fallback = `No automatic result. <a href="${spanishDict}" target="_blank" rel="noreferrer">SpanishDict</a> or <a href="${wordReference}" target="_blank" rel="noreferrer">WordReference</a>.`;
        setDefinition(fallback);
        setAllowHtml("trusted");
        onUpdateSideDefinition?.({
          wordText: selectedWord.text,
          wordIndex: selectedWord.index,
          wordHtml,
          meaningHtml: fallback
        });
      });

    return () => {
      isCurrent = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl, selectedWord, updatePosition, words]);

  useEffect(() => {
    updatePosition();
  }, [definition, updatePosition]);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest(".word")
      ) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const returnFocus = anchorEl;
        onClose();
        returnFocus?.focus();
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorEl, onClose, updatePosition]);

  if (!selectedWord || !anchorEl) return null;

  const canPlayFromHere =
    media === "text" || (hasAudioSource && Number.isFinite(selectedWord.start));

  const norm = normalizeWord(selectedWord.text);
  const isSaved = Boolean(
    studyLog &&
      Object.values(studyLog).some((entry) => normalizeWord(entry.word) === norm)
  );

  return (
    <div
      id="wordPopover"
      ref={popoverRef}
      className="word-popover"
      role="dialog"
      aria-label="Word meaning"
      tabIndex={-1}
      data-placement={coords.placement}
      style={{
        left: `${coords.left}px`,
        top: `${coords.top}px`,
        width: `${coords.width}px`
      }}
    >
      <p
        className="definition-word"
        dangerouslySetInnerHTML={{ __html: contextHTML || escapeHtml(selectedWord.text) }}
      />
      <p
        className="translation"
        dangerouslySetInnerHTML={{
          __html:
            allowHtml === "trusted"
              ? definition
              : allowHtml
                ? sanitizeEmphasisHtml(definition)
                : escapeHtml(definition)
        }}
      />
      <div className="popover-actions-row">
        {canPlayFromHere && (
          <button
            className="play-from-here"
            type="button"
            onClick={() => {
              onPlayFromHere(selectedWord.index);
              onClose();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Play from here
          </button>
        )}

        {speechSynthesisSupported && (
          <button
            className="play-from-here popover-pronounce-btn"
            type="button"
            onClick={() => pronounceSpanishWord(selectedWord.text, preferredVoiceURI)}
            title={`Pronounce “${selectedWord.text}”`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
            Pronounce
          </button>
        )}

        {studyLog && (
          <button
            className={`play-from-here popover-save-toggle${isSaved ? " is-saved" : ""}`}
            type="button"
            onClick={() => {
              if (isSaved) {
                onUnlogWord?.(selectedWord);
              } else if (definition && definition !== "Looking up...") {
                onLogWord(selectedWord, htmlToText(definition));
              }
            }}
            title={isSaved ? "Remove from study cards" : "Save to study cards"}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill={isSaved ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {isSaved ? "Saved" : "Save"}
          </button>
        )}
      </div>
    </div>
  );
};
