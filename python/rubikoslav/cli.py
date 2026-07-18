"""Low-friction command-line entry point for Rubikoslav."""

from __future__ import annotations

import argparse
import json
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Sequence

from . import (
    SOLVED_STATE,
    Rubikoslav,
    CuboslavWrapper,
    __version__,
    solve_payload,
    state_to_facelets,
)


class QuietStaticHandler(SimpleHTTPRequestHandler):
    """Serve packaged visualizer files without noisy request logs."""

    def log_message(self, format: str, *args: object) -> None:
        return


def web_directory() -> Path:
    module_path = Path(__file__).resolve()
    candidates = (
        module_path.parent / "web",
        module_path.parents[2] / "web",
    )
    for path in candidates:
        if (path / "index.html").is_file():
            return path
    searched = ", ".join(str(path) for path in candidates)
    raise RuntimeError(f"Visualizer assets were not found; searched {searched}")


def run_doctor(strict: bool = False) -> int:
    print(f"Rubikoslav {__version__}")

    cube = CuboslavWrapper()
    initial = cube.getCube()
    cube.move("R2")
    cube.move("R2")
    native_ok = cube.getCube() == initial
    print(f"  Native cube module: {'ok' if native_ok else 'failed'}")

    try:
        assets = web_directory()
        web_ok = True
        print(f"  Web visualizer:     ok ({assets})")
    except RuntimeError as error:
        web_ok = False
        print(f"  Web visualizer:     failed ({error})")

    try:
        facelets_ok = state_to_facelets(SOLVED_STATE).startswith("U" * 9)
        if strict:
            smoke_cube = CuboslavWrapper()
            for move in ("R", "U", "B'", "L2", "D", "F2"):
                smoke_cube.move(move)
            smoke_result = Rubikoslav().solve(smoke_cube.getCube())
            solver_ok = facelets_ok and smoke_result.success
            detail = (
                "ok (optimal IDA* solve and native replay)"
                if solver_ok
                else smoke_result.error
            )
        else:
            solver_ok = facelets_ok
            detail = "available (tables initialize on first solve)"
        print(f"  Optimal solver:     {detail}")
    except Exception as error:
        solver_ok = False
        print(f"  Optimal solver:     failed ({error})")

    print("  External data:      not required")
    healthy = native_ok and web_ok and solver_ok
    return 0 if healthy else 1


def serve_visualizer(host: str, port: int, open_browser: bool) -> int:
    directory = web_directory()
    solver = Rubikoslav(optimal_timeout_seconds=2)

    class VisualizerHandler(QuietStaticHandler):
        def __init__(self, *args: object, **kwargs: object) -> None:
            super().__init__(*args, directory=str(directory), **kwargs)

        def send_json(self, status: int, payload: dict[str, object]) -> None:
            encoded = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

        def do_GET(self) -> None:  # noqa: N802 - inherited HTTP handler API
            if self.path == "/api/solve":
                self.send_json(
                    200, {"success": True, "backend": "bounded-optimal-solver"}
                )
                return
            super().do_GET()

        def do_POST(self) -> None:  # noqa: N802 - inherited HTTP handler API
            if self.path != "/api/solve":
                self.send_json(404, {"success": False, "error": "Unknown API route"})
                return
            try:
                content_length = int(self.headers.get("Content-Length", "0"))
                if content_length <= 0 or content_length > 16_384:
                    raise ValueError("Solve request must contain a small JSON body")
                payload = json.loads(self.rfile.read(content_length))
                if not isinstance(payload, dict):
                    raise ValueError("Solve request must be a JSON object")
                status, response = solve_payload(payload, solver)
                self.send_json(status, response)
            except (ValueError, TypeError, json.JSONDecodeError) as error:
                self.send_json(400, {"success": False, "error": str(error)})

    try:
        server = ThreadingHTTPServer((host, port), VisualizerHandler)
    except OSError as error:
        raise SystemExit(
            f"Could not start the visualizer on {host}:{port}: {error}"
        ) from error

    display_host = "127.0.0.1" if host in {"0.0.0.0", "::"} else host
    url = f"http://{display_host}:{server.server_port}"
    print(f"Rubikoslav visualizer: {url}")
    print("Press Ctrl+C to stop.")

    if open_browser:
        threading.Timer(0.25, webbrowser.open, args=(url,)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nVisualizer stopped.")
    finally:
        server.server_close()
    return 0


def solve_scramble(scramble: str, max_depth: int | None, verbose: bool) -> int:
    """Solve a notation scramble from the command line."""

    try:
        moves = scramble.split()
        solver = Rubikoslav()
        if moves:
            solver.initialize(verbose=verbose)
        result = solver.solve_scramble(moves, max_depth=max_depth)
    except Exception as error:
        print(f"Solve failed: {error}", file=sys.stderr)
        return 1

    if not result.success:
        print(f"Solve failed: {result.error}", file=sys.stderr)
        return 1
    print(f"Scramble: {scramble or '(solved cube)'}")
    move_label = "move" if len(result.moves) == 1 else "moves"
    print(
        f"Solution ({len(result.moves)} {move_label}): "
        f"{' '.join(result.moves) or '(already solved)'}"
    )
    print(f"Verified by native replay in {result.elapsed_microseconds / 1_000:.1f} ms")
    return 0


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(
        prog="rubikoslav",
        description="Visualize, solve, or inspect the Rubikoslav engine.",
    )
    result.add_argument(
        "command", nargs="?", choices=("web", "solve", "doctor"), default="web"
    )
    result.add_argument(
        "scramble", nargs="?", help="standard notation scramble for the solve command"
    )
    result.add_argument(
        "--host", default="127.0.0.1", help="web server host (default: 127.0.0.1)"
    )
    result.add_argument(
        "--port", type=int, default=4173, help="web server port (default: 4173)"
    )
    result.add_argument(
        "--no-open", action="store_true", help="do not open the browser automatically"
    )
    result.add_argument(
        "--max-depth",
        type=int,
        default=None,
        help="optional solution limit from 0 to 20 HTM moves (default: 20)",
    )
    result.add_argument(
        "--verbose",
        action="store_true",
        help="show first-run table initialization progress",
    )
    result.add_argument(
        "--strict",
        action="store_true",
        help="make doctor perform a real solve and replay",
    )
    result.add_argument(
        "--version", action="version", version=f"%(prog)s {__version__}"
    )
    return result


def main(argv: Sequence[str] | None = None) -> int:
    arguments = parser().parse_args(argv)
    if arguments.command == "doctor":
        return run_doctor(arguments.strict)
    if arguments.command == "solve":
        return solve_scramble(
            arguments.scramble or "", arguments.max_depth, arguments.verbose
        )
    if arguments.scramble:
        parser().error("a scramble can only be supplied with the solve command")
    return serve_visualizer(arguments.host, arguments.port, not arguments.no_open)
