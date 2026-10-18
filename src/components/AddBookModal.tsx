import React, { useState } from "react";
import { createPersonalBookId, savePersonalBook } from "../utils/storage";
import { difficultyOrder } from "../utils/constants";
import { readingMinutes } from "../utils/text";
import type { PersonalBook } from "../types";

export interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookAdded: (book: PersonalBook) => void;
}

export function resetAddBookForm(
  setTitle?: (v: string) => void,
  setText?: (v: string) => void,
  setDifficulty?: (v: string) => void,
  setError?: (v: string) => void
): void {
  setTitle?.("");
  setText?.("");
  setDifficulty?.("B2");
  setError?.("");
}

export function showAddBookError(setError: (v: string) => void, message: string): void {
  setError(message);
}

export function hideAddBookError(setError: (v: string) => void): void {
  setError("");
}

export const AddBookModal: React.FC<AddBookModalProps> = ({
  isOpen,
  onClose,
  onBookAdded
}) => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [difficulty, setDifficulty] = useState("B2");
  const [text, setText] = useState("");
  const [coverDataUrl, setCoverDataUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleTextFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("File exceeds 2MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = String(event.target?.result || "");
      setText(result);
      if (!title) {
        const guessedTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setTitle(guessedTitle);
      }
    };
    reader.readAsText(file);
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCoverDataUrl(String(event.target?.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a title.");
      return;
    }
    if (!text.trim()) {
      setError("Please provide Spanish text or choose a text file.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const wordsCount = text.trim().split(/\s+/).length;
      const newBook: PersonalBook = {
        id: createPersonalBookId(),
        title: title.trim(),
        author: author.trim() || undefined,
        difficulty,
        collection: "my-books",
        personal: true,
        customText: text.trim(),
        cover: coverDataUrl || undefined,
        minutes: readingMinutes(wordsCount),
        addedAt: new Date().toISOString()
      };

      await savePersonalBook(newBook);
      onBookAdded(newBook);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || "Could not save personal book.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <dialog
        id="addBookDialog"
        className="add-book-dialog is-open"
        open
        onClick={(e) => e.stopPropagation()}
        aria-labelledby="addBookDialogTitle"
      >
        <form id="addBookForm" className="add-book-shell" onSubmit={handleSubmit}>
          <header className="add-book-header">
            <div>
              <p className="eyebrow">Your private library</p>
              <h2 id="addBookDialogTitle">Add a book</h2>
              <p>Import plain Spanish text. It stays in this browser and is never uploaded.</p>
            </div>
            <button
              id="closeAddBookBtn"
              className="utility-button"
              type="button"
              aria-label="Close add book dialog"
              onClick={onClose}
            >
              ✕
            </button>
          </header>

          <div className="add-book-body">
            {error && (
              <p id="addBookError" className="error-banner">
                {error}
              </p>
            )}

            <label>
              <span>Title *</span>
              <input
                id="bookTitle"
                required
                placeholder="e.g. La metamorfosis"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <label>
              <span>Author</span>
              <input
                id="bookAuthor"
                placeholder="e.g. Franz Kafka"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </label>

            <label>
              <span>Difficulty level</span>
              <select
                id="bookDifficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                {difficultyOrder.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Text file (.txt)</span>
              <input
                id="bookFile"
                type="file"
                accept=".txt,text/plain"
                onChange={handleTextFileChange}
              />
            </label>

            <label>
              <span>Or paste Spanish text *</span>
              <textarea
                id="bookText"
                rows={6}
                placeholder="Paste your plain-text Spanish here…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>

            <label>
              <span>Cover image (optional)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverFileChange}
              />
            </label>
          </div>

          <footer className="add-book-footer">
            <button
              id="cancelAddBookBtn"
              className="secondary-btn"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              id="saveAddBookBtn"
              className="primary-btn"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving…" : "Add to My books"}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
};
