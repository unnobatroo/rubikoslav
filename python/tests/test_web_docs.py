from __future__ import annotations

import re
import unittest

from api.solve import _STATIC_FILES
from rubikoslav.cli import web_directory


class WebDocsTests(unittest.TestCase):
    def test_project_resources_are_linked_and_styles_are_packaged(self) -> None:
        directory = web_directory()
        index = (directory / "index.html").read_text(encoding="utf-8")

        self.assertFalse((directory / "api.html").exists())
        self.assertNotIn('href="api.html"', index)
        self.assertIn("https://unnobatroo.github.io/rubikoslav/", index)
        self.assertIn("https://pypi.org/project/rubikoslav/", index)
        self.assertIn(">Wiki<", index)
        self.assertIn("<span>Package</span>", index)
        self.assertIn('href="#icon-package"', index)
        self.assertIn("https://jalols.page", index)
        self.assertIn("By Jaloliddin Ismailov", index)
        self.assertIn('class="control-footer"', index)
        self.assertIn('class="creator-link"', index)

        style_entry = (directory / "styles.css").read_text(encoding="utf-8")
        style_modules = re.findall(r"@import url\('./styles/(.+?\.css)'\);", style_entry)
        self.assertEqual(len(style_modules), 6)
        for module in style_modules:
            route = f"/styles/{module}"
            self.assertIn(route, _STATIC_FILES)
            self.assertTrue(_STATIC_FILES[route].is_file(), module)


if __name__ == "__main__":
    unittest.main()
