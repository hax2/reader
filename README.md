# Spanish Listening Reader

Static GitHub Pages app for listening to Spanish audio while reading synced text. Click a word to look up an English meaning.

The homepage is a mobile-first list of hosted readings. Each reading saves its own playback position in the browser, so users can leave and resume different audios independently.

## Use locally

Open `index.html` in a browser, or serve the folder with any static server.

## Publish on GitHub Pages

Push these files to a GitHub repository, then enable Pages from the repository root in **Settings -> Pages**.

Run this after adding or removing hosted audio files:

```sh
python3 scripts/build_library.py
```

If a hosted audio file has a same-name JSON transcript, the site loads it automatically. Example:

```text
my-audio.m4a
my-audio.json
```

## Transcribe with your NVIDIA GPU

Install the transcription environment:

```sh
./scripts/setup_transcriber.sh
```

Create a synced transcript from your normal terminal, where the NVIDIA driver is available:

```sh
./scripts/transcribe_gpu.sh "Vanguardia_revolucionaria_frente_a_política_sindical.m4a" --model medium --vtt
python scripts/build_library.py
```

The setup installs `faster-whisper` plus CUDA 12 cuBLAS/cuDNN wheels. Use `transcribe_gpu.sh` instead of calling `transcribe.py` directly because the wrapper exposes those CUDA libraries through `LD_LIBRARY_PATH`.

The script uses Spanish language mode and word timestamps. It defaults to CUDA with `float16`, which is the right path for an RTX GPU. If VRAM is tight, use:

```sh
./scripts/transcribe_gpu.sh audio.m4a --model small --compute-type int8_float16
```

If `nvidia-smi` cannot see the GPU, fix the NVIDIA driver or CUDA runtime first, or run with `--device cpu --compute-type int8`.

## Transcript formats

For accurate highlighting, upload a timed transcript next to the audio.

Supported JSON word format:

```json
[
  { "word": "Hola", "start": 0.12, "end": 0.42, "translation": "Hello" },
  { "word": "mundo", "start": 0.43, "end": 0.88, "translation": "world" }
]
```

Whisper-style JSON with `segments[].words[]` is also supported.

WebVTT and SRT are supported too. If a cue contains a full sentence, the app spreads that cue's time across the words in the sentence. For word-accurate highlighting, export word-level timings from your transcription tool.

When you only have plain text, paste it into the sidebar. The app will estimate timings across the audio duration, which is useful for reading but not exact.
