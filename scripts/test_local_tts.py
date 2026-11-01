"""Language routing and cache safety checks; no GPU or model download required."""
import argparse
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import local_tts
import transcribe


class NarrationLanguageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / local_tts.REFERENCE_AUDIO).write_bytes(b"reference")
        (self.root / "book.txt").write_text("Nel mezzo del cammin di nostra vita.")
        self.args = argparse.Namespace(only=[], max_chars=500, model_size="1.7B", alignment_model="medium")

    def jobs(self, entries):
        (self.root / "library.json").write_text(json.dumps(entries))
        return local_tts.build_jobs(self.root, self.root / "cache", self.args)

    def test_languages_have_distinct_caches_and_spanish_is_default(self):
        jobs = self.jobs([
            {"id": "spanish", "text": "book.txt"},
            {"id": "italian", "text": "book.txt", "language": "it"},
        ])
        self.assertEqual([job["language"] for job in jobs], ["es", "it"])
        self.assertNotEqual(jobs[0]["signature"], jobs[1]["signature"])
        self.assertEqual(jobs[0]["signature"], local_tts.content_signature(jobs[0]["text"], self.root, self.args))

    def test_alignment_groups_languages(self):
        jobs = self.jobs([
            {"id": "spanish", "text": "book.txt"},
            {"id": "italian", "text": "book.txt", "language": "it"},
        ])
        (self.root / "scripts").mkdir()
        (self.root / "scripts/transcribe_gpu.sh").touch()
        (self.root / ".venv").mkdir()
        with patch.object(local_tts.subprocess, "run") as run, patch.object(local_tts, "validate_aligned_transcript"):
            local_tts.align_jobs(self.root, jobs, self.args)
        commands = [call.args[0] for call in run.call_args_list]
        self.assertEqual([cmd[-2:] for cmd in commands], [["--language", "es"], ["--language", "it"]])

    def test_wrong_language_transcript_is_rejected(self):
        job = self.jobs([{"id": "italian", "text": "book.txt", "language": "it"}])[0]
        payload = dict(source=job["audio_path"].name, model="medium", language="es",
                       timingMethod="faster-whisper-word-timestamps", words=[dict(word="Nel", start=0, end=1)])
        job["transcript_path"].write_text(json.dumps(payload))
        with self.assertRaises(RuntimeError):
            local_tts.validate_aligned_transcript(job, "medium")
        payload["language"] = "it"
        job["transcript_path"].write_text(json.dumps(payload))
        local_tts.validate_aligned_transcript(job, "medium")

    def test_whisper_receives_italian(self):
        class Model:
            def transcribe(self, path, **kwargs):
                self.language = kwargs["language"]
                return iter([]), argparse.Namespace(language="it", language_probability=1)
        model = Model()
        args = argparse.Namespace(output=self.root / "transcript.json", language="it", beam_size=5, no_vad=False, model="medium", vtt=False)
        transcribe.transcribe_audio(model, self.root / "book.m4a", args)
        self.assertEqual(model.language, "it")


if __name__ == "__main__":
    unittest.main()
