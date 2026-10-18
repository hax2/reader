import React, { useState, useRef, useEffect } from "react";
import { createPersonalBookId, savePersonalBook } from "../utils/storage";
import { difficultyOrder, maxPersonalBookBytes } from "../utils/constants";
import { readingMinutes } from "../utils/text";
import { tokenizeUntimed } from "../utils/tokenization";
import type { PersonalBook } from "../types";

export interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookAdded: (book: PersonalBook) => void;
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
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          dialog.setAttribute("open", "");
        }
      }
      setError("");
      window.setTimeout(() => titleInputRef.current?.focus(), 0);
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const resetForm = () => {
    setTitle("");
    setAuthor("");
    setDifficulty("B2");
    setText("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTextFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > maxPersonalBookBytes) {
      setError("That file is larger than 2 MB. Choose a smaller plain-text file.");
      e.target.value = "";
      return;
    }
    try {
      const fileText = await file.text();
      setText(fileText);
      if (!title.trim()) {
        setTitle(file.name.replace(/\.(?:txt|md)$/i, "").replace(/[_-]+/g, " ").trim());
      }
    } catch {
      setError("That file could not be read as plain text.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedText = text.trim();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !trimmedText) {
      setError("Add a title and some Spanish text before saving.");
      return;
    }
    if (new Blob([trimmedText]).size > maxPersonalBookBytes) {
      setError("This text is larger than 2 MB. Split it into smaller books before importing.");
      return;
    }

    const parsed = tokenizeUntimed(trimmedText);
    if (!parsed.length) {
      setError("The book needs at least one readable word.");
      return;
    }

    const newBook: PersonalBook = {
      id: createPersonalBookId(),
      title: trimmedTitle,
      author: author.trim(),
      difficulty: (difficultyOrder as readonly string[]).includes(difficulty) ? difficulty : "B2",
      collection: "my-books",
      description: "Added to your private library",
      customText: trimmedText,
      wordCount: parsed.length,
      minutes: readingMinutes(parsed.length),
      personal: true,
      addedAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      await savePersonalBook(newBook);
      resetForm();
      onBookAdded(newBook);
      onClose();
    } catch {
      setError("This browser could not save the book. Check that site storage is available and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <dialog
      id="addBookDialog"
      ref={dialogRef}
      className="add-book-dialog"
      aria-labelledby="addBookDialogTitle"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
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
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        <div className="add-book-body">
          <div className="add-book-fields">
            <label>
              <span>Title</span>
              <input
                id="bookTitle"
                ref={titleInputRef}
                name="title"
                type="text"
                maxLength={160}
                required
                autoComplete="off"
                placeholder="Book title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              <span>
                Author <small>optional</small>
              </span>
              <input
                id="bookAuthor"
                name="author"
                type="text"
                maxLength={120}
                autoComplete="off"
                placeholder="Author name"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </label>
            <label>
              <span>Reading level</span>
              <select
                id="bookDifficulty"
                name="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="A2">A2 · Early reader</option>
                <option value="B1">B1 · Intermediate</option>
                <option value="B2">B2 · Upper intermediate</option>
                <option value="C1">C1 · Advanced</option>
              </select>
            </label>
          </div>

          <label className="book-file-pick">
            <span>Choose a text file</span>
            <small>UTF-8 .txt or .md, up to 2 MB</small>
            <input
              id="bookFile"
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={handleTextFileChange}
            />
          </label>

          <div className="add-book-divider">
            <span>or paste the text</span>
          </div>

          <label className="book-text-field">
            <span>Spanish text</span>
            <textarea
              id="bookText"
              name="text"
              rows={10}
              required
              placeholder="Paste the book or reading here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>

          <p id="addBookError" className="add-book-error" role="alert" hidden={!error}>
            {error}
          </p>
        </div>

        <footer className="add-book-footer">
          <p>Personal books are available only on this device and browser.</p>
          <div>
            <button
              id="cancelAddBookBtn"
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Cancel
            </button>
            <button className="primary-action" type="submit" disabled={isSubmitting}>
              Save to My books
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
};
