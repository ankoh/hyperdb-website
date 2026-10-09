from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

import generate_svg_symbols


class GenerateSvgSymbolsTest(unittest.TestCase):
    def test_combines_inputs_preserving_attributes_artwork_and_sources(self):
        sources = {
            "first.svg": (
                '<svg xmlns="http://www.w3.org/2000/svg" id="original-first" '
                'width="24" height="24" viewBox="0 0 24 24" fill="none" '
                'stroke="currentColor" stroke-width="2" style="color: red">'
                '<g opacity="0.5"><path fill="currentColor" d="M0 0h24v24z"/></g>'
                '</svg>'
            ),
            "second.svg": (
                '<svg xmlns="http://www.w3.org/2000/svg" id="original-second" '
                'viewBox="-5 -5 10 10" fill="var(--gazelle-outline, currentColor)">'
                '<circle cx="0" cy="0" r="5" fill="var(--gazelle-fill, currentColor)"/></svg>'
            ),
        }
        with tempfile.TemporaryDirectory() as directory:
            inputs = [Path(directory) / name for name in sources]
            for path, source in zip(inputs, sources.values()):
                path.write_bytes(source.encode("utf-8"))
            output = Path(directory) / "symbols.svg"

            with patch.object(sys, "argv", ["generate_svg_symbols.py", "--output", str(output), *map(str, inputs)]):
                generate_svg_symbols.main()

            atlas = ET.parse(output).getroot()
            self.assertEqual(atlas.tag, f"{{{generate_svg_symbols.SVG_NS}}}svg")
            symbols = list(atlas)
            self.assertEqual(len(symbols), 2)
            self.assertEqual(symbols[0].attrib, {
                "id": "first", "viewBox": "0 0 24 24", "fill": "none",
                "stroke": "currentColor", "stroke-width": "2", "style": "color: red",
            })
            self.assertEqual(symbols[1].attrib, {
                "id": "second", "viewBox": "-5 -5 10 10", "fill": "var(--gazelle-outline, currentColor)",
            })
            for symbol, path, source in zip(symbols, inputs, sources.values()):
                self.assertEqual(symbol.tag, f"{{{generate_svg_symbols.SVG_NS}}}symbol")
                self.assertEqual(
                    [ET.tostring(child) for child in symbol],
                    [ET.tostring(child) for child in ET.fromstring(source)],
                )
                self.assertEqual(path.read_bytes(), source.encode("utf-8"))

    def test_rejects_duplicate_filename_ids(self):
        with tempfile.TemporaryDirectory() as directory:
            first = Path(directory) / "same.svg"
            second = Path(directory) / "nested" / "same.svg"
            second.parent.mkdir()
            for index, path in enumerate((first, second)):
                path.write_text(
                    '<svg xmlns="http://www.w3.org/2000/svg" '
                    f'id="original-{index}" viewBox="0 0 10 10"/>',
                    encoding="utf-8",
                )
            output = Path(directory) / "symbols.svg"

            with patch.object(sys, "argv", ["generate_svg_symbols.py", "--output", str(output), str(first), str(second)]):
                with self.assertRaisesRegex(ValueError, "^Duplicate symbol ID: same$"):
                    generate_svg_symbols.main()
            self.assertFalse(output.exists())

    def test_rejects_missing_viewbox(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "missing.svg"
            source.write_text(
                '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
                encoding="utf-8",
            )
            output = Path(directory) / "symbols.svg"

            with patch.object(sys, "argv", ["generate_svg_symbols.py", "--output", str(output), str(source)]):
                with self.assertRaisesRegex(ValueError, "expected an SVG with a viewBox"):
                    generate_svg_symbols.main()
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
