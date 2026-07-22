# Production usage

Rubikoslav embeds a native extension and performs CPU-bound synchronous search. Treat it like a local compute library, not an async network client.

## Pin and install a wheel

Pin the version in application dependencies:

```text
rubikoslav==1.0.3
```

If your build environment must never compile C++:

```bash
python -m pip install --only-binary=:all: rubikoslav==1.0.3
```

This fails immediately when no compatible wheel exists. Current release targets are listed in [installation and quickstart](getting-started.md#requirements).

## Choose the latency model

Known move histories are cheap: `solve_scramble()` can usually return a verified inverse without initializing optimal-search tables.

Arbitrary-state optimal solving is different. It may initialize pruning tables on first use and can consume meaningful CPU time:

```python
from rubikoslav import Rubikoslav

Rubikoslav.initialize()
solver = Rubikoslav()
```

Call `initialize()` during process startup only if that process will use `solve(state)` without a history and you are willing to pay the warm-up cost before serving traffic.

For a bounded request path, configure a timeout:

```python
solver = Rubikoslav(optimal_timeout_seconds=2)
```

After the optimal timeout, the solver attempts a local two-phase route. Success still means no more than 20 HTM moves and successful native replay; it does not mean the route is shortest.

## Place the cache explicitly

The optimal backend stores generated tables under the normal user cache directory. Set an explicit writable location in containers and managed runtimes:

```bash
export RUBIKOSLAV_CACHE_DIR=/var/cache/rubikoslav
```

Persist that directory when warm starts matter. Deleting it is safe, but the next optimal solve regenerates the tables.

The history and two-phase paths keep their search data in the local process and do not call a third-party solver service.

## Concurrency

Backend initialization and searches are process-global and locked. Multiple threads may call the API safely, but expensive searches run one at a time inside a process.

- Use `asyncio.to_thread()` to avoid blocking an async event loop.
- Use multiple worker processes for parallel throughput.
- Warm each worker that needs arbitrary-state optimal search.
- Set request timeouts outside the library as well as `optimal_timeout_seconds` inside it.

Do not expect one Python process with a large thread pool to solve many positions in parallel.

## Health checks

A light import/native check:

```bash
rubikoslav doctor
```

A deployment smoke test that performs a real optimal solve:

```bash
rubikoslav doctor --strict
```

Use the strict form during image creation or deployment verification rather than on a frequent liveness probe.

## Logging and metrics

`SolveResult` already exposes useful dimensions:

```python
result = solver.solve_scramble(scramble)

metrics.observe("solve_ms", result.elapsed_microseconds / 1_000)
metrics.increment("solve_result", tags={
    "success": str(result.success).lower(),
    "backend": result.backend,
    "optimal": str(result.optimal).lower(),
})
```

Avoid logging raw cube states unless your application explicitly needs them. For failures, log `backend`, elapsed time, and the human-readable error without treating the exact error string as a stable machine code.

## Licensing

Rubikoslav is GPL-3.0-only. Review the license obligations before distributing an application that embeds or ships the package.
