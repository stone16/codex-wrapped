# Codex Wrapped

Generate a Spotify Wrapped-style summary of your Codex CLI usage and a shareable PNG.

## Quick Start

```bash
npx codex-wrapped
```

## Outputs

- `./codex-wrapped/codex-wrapped.png` — shareable image
- `./codex-wrapped/index.html` — dashboard view
- `./codex-wrapped/data.json` — aggregated usage data

Use `--out` to change the output directory and `--image` to override the PNG path:

```bash
npx codex-wrapped --out ./my-wrapped --image ./my-wrapped/share.png
```

## Configuration

By default, Codex Wrapped reads `codex-wrapped.config.yaml`. Override the path with:

```bash
npx codex-wrapped --config ./custom-config.yaml
```

See `codex-wrapped.config.yaml` for available options.
