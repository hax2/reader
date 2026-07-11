#!/usr/bin/env bash
set -euo pipefail

process_audio() {
    local AUDIO_FILE="$1"
    echo "==> Transcribing '$AUDIO_FILE'..."
    ./scripts/transcribe_gpu.sh "$AUDIO_FILE" --model medium --vtt
}

NEW_FILES_PROCESSED=0
declare -a PROCESSED_NAMES

if [ "$#" -gt 0 ]; then
    # Process files passed as arguments (useful for drag-and-drop)
    for AUDIO_FILE in "$@"; do
        if [ -f "$AUDIO_FILE" ]; then
            # Copy to current directory if dragged from somewhere else
            if [ "$(dirname "$AUDIO_FILE")" != "." ] && [ "$(dirname "$AUDIO_FILE")" != "$(pwd)" ]; then
                echo "==> Copying '$AUDIO_FILE' to current folder..."
                cp "$AUDIO_FILE" .
                AUDIO_FILE=$(basename "$AUDIO_FILE")
            fi
            
            process_audio "$AUDIO_FILE"
            NEW_FILES_PROCESSED=$((NEW_FILES_PROCESSED + 1))
            BASENAME=$(basename -- "$AUDIO_FILE")
            PROCESSED_NAMES+=("${BASENAME%.*}")
        else
            echo "Warning: File '$AUDIO_FILE' not found."
        fi
    done
else
    # Auto-detect new audio files in the current folder
    echo "==> Scanning for new audio files (*.mp3, *.m4a)..."
    shopt -s nullglob
    for AUDIO_FILE in *.mp3 *.m4a; do
        BASENAME="${AUDIO_FILE%.*}"
        # If the transcript json doesn't exist, we consider it new
        if [ ! -f "${BASENAME}.json" ]; then
            echo "Found new audio: $AUDIO_FILE"
            process_audio "$AUDIO_FILE"
            NEW_FILES_PROCESSED=$((NEW_FILES_PROCESSED + 1))
            PROCESSED_NAMES+=("$BASENAME")
        fi
    done
    shopt -u nullglob
fi

if [ "$NEW_FILES_PROCESSED" -eq 0 ]; then
    echo "No new audio files to process. Everything is up to date!"
    exit 0
fi

echo "==> Rebuilding library..."
python3 scripts/build_library.py

echo "==> Rebuilding glossary..."
python3 scripts/build_glossary.py

echo "==> Committing and pushing to GitHub..."
git add .

if [ "$NEW_FILES_PROCESSED" -eq 1 ]; then
    CLEAN_NAME="${PROCESSED_NAMES[0]//_/ }"
    git commit -m "Add $CLEAN_NAME"
else
    git commit -m "Auto-add $NEW_FILES_PROCESSED new audio files"
fi

git push

echo "==> Successfully processed and pushed to GitHub!"
