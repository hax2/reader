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
import type { WordToken } from "../types";

export interface SideDefinition {
  wordHtml: string;
  meaningHtml: string;
}

export interface WordPopoverProps {
  selectedWord: WordToken | null;
  anchorEl: HTMLButtonElement | null;
  words: WordToken[];
  media: "audio" | "text";
  hasAudioSource?: boolean;
  onClose: () => void;
  onPlayFromHere: (wordIndex: number) => void;
  onLogWord: (word: WordToken, meaning: string) => void;
  onUpdateSideDefinition?: (def: SideDefinition) => void;
}

export const WordPopover: React.FC<WordPopoverProps> = ({
  selectedWord,
  anchorEl,
  words,
  media,
  hasAudioSource = true,
  onClose,
  onPlayFromHere,
  onLogWord,
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
        wordHtml,
        meaningHtml: sanitizeEmphasisHtml(instant)
      });
      onLogWord(selectedWord, instant);
      return;
    }

    setDefinition("Looking up...");
    setAllowHtml(false);
    onUpdateSideDefinition?.({
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
          wordHtml,
          meaningHtml: fallback
        });
      });

    return () => {
      isCurrent = false;
    };
  }, [anchorEl, onLogWord, onUpdateSideDefinition, selectedWord, updatePosition, words]);

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
    </div>
  );
};
