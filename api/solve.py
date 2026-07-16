"""Vercel entry point for the same solver used by the local uv server."""

from __future__ import annotations

import json
import mimetypes
import os
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit

if os.environ.get("VERCEL"):
    os.environ["HOME"] = "/tmp"
    os.environ["RUBIKOSLAV_CACHE_DIR"] = "/tmp/rubikoslav-optimal"

from rubikoslav import Rubikoslav, solve_payload

_SOLVER = Rubikoslav(optimal_timeout_seconds=2)
_WEB_DIRECTORY = Path(__file__).resolve().parents[1] / "web"
_STATIC_FILES = {
    "/": _WEB_DIRECTORY / "index.html",
    "/index.html": _WEB_DIRECTORY / "index.html",
    "/api.html": _WEB_DIRECTORY / "api.html",
    "/styles.css": _WEB_DIRECTORY / "styles.css",
    "/dist/app.js": _WEB_DIRECTORY / "dist" / "app.js",
    "/dist/generated/cube-data.js": _WEB_DIRECTORY
    / "dist"
    / "generated"
    / "cube-data.js",
}


class handler(BaseHTTPRequestHandler):
    def send_bytes(
        self, status: int, content: bytes, content_type: str, cache: str = "no-cache"
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", cache)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(content)

    def send_json(self, status: int, payload: dict[str, object]) -> None:
        encoded = json.dumps(payload).encode("utf-8")
        self.send_bytes(status, encoded, "application/json")

    def do_GET(self) -> None:  # noqa: N802 - Vercel handler API
        path = urlsplit(self.path).path
        if path == "/api/solve":
            self.send_json(200, {"success": True, "backend": "adaptive-solver"})
            return
        asset = _STATIC_FILES.get(path)
        if asset is None or not asset.is_file():
            self.send_json(404, {"success": False, "error": "Not found"})
            return
        content_type = mimetypes.guess_type(asset.name)[0] or "application/octet-stream"
        cache = (
            "public, max-age=31536000, immutable"
            if path.startswith("/dist/")
            else "no-cache"
        )
        self.send_bytes(200, asset.read_bytes(), content_type, cache)

    def do_POST(self) -> None:  # noqa: N802 - Vercel handler API
        try:
            if urlsplit(self.path).path != "/api/solve":
                self.send_json(404, {"success": False, "error": "Not found"})
                return
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0 or content_length > 16_384:
                raise ValueError("Solve request must contain a small JSON body")
            payload = json.loads(self.rfile.read(content_length))
            if not isinstance(payload, dict):
                raise ValueError("Solve request must be a JSON object")
            status, response = solve_payload(payload, _SOLVER)
            self.send_json(status, response)
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            self.send_json(400, {"success": False, "error": str(error)})
