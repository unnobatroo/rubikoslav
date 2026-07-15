from __future__ import annotations

import unittest

from rubikoslav.cli import web_directory


class WebDocsTests(unittest.TestCase):
    def test_api_guide_is_packaged_and_linked(self) -> None:
        directory = web_directory()
        index = (directory / "index.html").read_text(encoding="utf-8")
        guide = (directory / "api.html").read_text(encoding="utf-8")

        self.assertIn('href="api.html"', index)
        self.assertIn("Python API", index)
        self.assertIn("https://jalols.page", index)
        self.assertIn("By Jaloliddin Ismailov", index)
        self.assertIn("Rubikoslav().solve", guide)
        self.assertIn("/api/solve", guide)
        self.assertIn("JavaScript sends the current position", guide)


if __name__ == "__main__":
    unittest.main()
