# Contributing to SIANN

SIANN is an early-stage, local-first AI-native DAW project. Contributions should keep the audio engine, command bridge, agent runtime, and UI boundaries clear.

## Development Setup

Start with the product/bridge repo:

```sh
git clone https://github.com/romanticamaj/siann.git
cd siann
npm test
npm run smoke:dawproject -- --json
```

Clone the engine only when you are working on live session commands, preview
rendering, Ardour session mutation, or engine integration tests:

```sh
git clone https://github.com/romanticamaj/siann-engine.git
```

The bridge defaults to `../siann-engine`. Set
`SIANN_ENGINE_DIR=/path/to/siann-engine` if your checkout lives elsewhere.

On Windows, start with the Node-only DAWproject path before engine runtime
testing:

```powershell
git clone https://github.com/romanticamaj/siann.git
cd siann
npm test
npm run smoke:dawproject -- --out "$env:TEMP\siann-dawproject-smoke" --json
```

See [docs/setup/windows.md](docs/setup/windows.md) for Cubase DAWproject import
testing and skill installation notes.

## Before Opening a Pull Request

- Run `npm test` from the SIANN repo.
- Run `npm run smoke:dawproject -- --json` for cross-platform DAWproject changes.
- For engine-facing bridge changes, run a real command fixture:

```sh
rm -rf /tmp/siann-demo/create-session
node bin/siann.js run examples/bridge/create-session.command.json --json
```

- Keep README public-facing. Put implementation details, ADR links, and internal workflow notes in `AGENTS.md` or `docs/`.
- Use SIANN/`siann` consistently in public names, schemas, CLI commands, examples, and generated paths.

## Commit Style

Use short Conventional Commit-style subjects:

```text
feat: add import-pack workflow
fix: reject ambiguous track placement
docs: update command journal contract
```

## Licensing

By contributing, you agree that your contribution is provided under this repository's GPL-2.0-or-later license. Do not submit code or assets you do not have the right to contribute.
