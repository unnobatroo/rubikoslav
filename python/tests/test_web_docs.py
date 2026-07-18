from __future__ import annotations

import re
import unittest

from api.solve import _STATIC_FILES
from rubikoslav.cli import web_directory


class WebDocsTests(unittest.TestCase):
    def test_api_guide_is_packaged_and_linked(self) -> None:
        directory = web_directory()
        index = (directory / "index.html").read_text(encoding="utf-8")
        guide = (directory / "api.html").read_text(encoding="utf-8")

        self.assertIn('href="api.html"', index)
        self.assertIn("https://unnobatroo.github.io/rubikoslav/", index)
        self.assertIn(">Wiki<", index)
        self.assertIn("<span>API</span>", index)
        self.assertIn("https://jalols.page", index)
        self.assertIn("By Jaloliddin Ismailov", index)
        self.assertIn('class="control-footer"', index)
        self.assertIn('class="creator-link"', index)
        self.assertIn("pip install rubikoslav", guide)
        self.assertIn('Rubikoslav().solve_scramble("R U F2")', guide)
        self.assertIn("Rubikoslav().solve(state)", guide)
        self.assertIn("/api/solve", guide)
        self.assertIn("Full documentation", guide)

        style_entry = (directory / "styles.css").read_text(encoding="utf-8")
        style_modules = re.findall(r"@import url\('./styles/(.+?\.css)'\);", style_entry)
        self.assertEqual(len(style_modules), 7)
        for module in style_modules:
            route = f"/styles/{module}"
            self.assertIn(route, _STATIC_FILES)
            self.assertTrue(_STATIC_FILES[route].is_file(), module)


if __name__ == "__main__":
    unittest.main()
