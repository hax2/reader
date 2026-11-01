"""Verify that each section is published before synthesis starts on the next."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import narrate_sections


class SectionQueueTests(unittest.TestCase):
    def test_each_section_is_pushed_before_the_next_starts(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            path = root / 'library.json'
            catalog = [dict(id=f'c{i}', title=f'Canto {i}', collection='dante-inferno', text=f'{i}.txt') for i in (1, 2)]
            path.write_text(json.dumps(catalog))
            events = []

            def run(root, command):
                if command[0] != 'git':
                    identifier = command[-1]
                    events.append(('synthesize', identifier))
                    entry = next(item for item in catalog if item['id'] == identifier)
                    entry.update(audio=f'{identifier}.m4a', transcript=f'{identifier}.json')
                    path.write_text(json.dumps(catalog))

            def push(root, entry):
                events.append(('push', entry['id']))

            with patch.object(narrate_sections.subprocess, 'check_output', return_value='main\n'), patch.object(narrate_sections, 'run', side_effect=run), patch.object(narrate_sections, 'push_section', side_effect=push):
                narrate_sections.narrate_sections(root, 'dante-inferno', True)
            self.assertEqual(events, [('synthesize', 'c1'), ('push', 'c1'), ('synthesize', 'c2'), ('push', 'c2')])

    def test_failed_alignment_is_not_pushed(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'library.json').write_text(json.dumps([dict(id='c1', title='Canto I', collection='dante-inferno', text='1.txt')]))
            with patch.object(narrate_sections, 'run'), patch.object(narrate_sections, 'push_section') as push:
                with self.assertRaisesRegex(RuntimeError, 'did not publish'):
                    narrate_sections.narrate_sections(root, 'dante-inferno', False)
                push.assert_not_called()

    def test_resume_skips_completed_sections(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'library.json').write_text(json.dumps([dict(id='c1', title='Canto I', collection='dante-inferno', audio='1.m4a', transcript='1.json')]))
            with patch.object(narrate_sections, 'run') as run:
                narrate_sections.narrate_sections(root, 'dante-inferno', False)
                run.assert_not_called()


if __name__ == '__main__':
    unittest.main()
