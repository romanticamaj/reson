# SIANN Bridge Examples

These fixtures are small command files for exploring the developer bridge CLI.

Run from the repository root:

```sh
npm test
node bin/siann.js run examples/bridge/create-session.command.json --json
node bin/siann.js validate-journal /tmp/siann-demo/create-session/journal.json --json
```

By default, the CLI expects the Ardour-derived engine checkout at `../siann-engine`.
Use `--engine-dir /path/to/siann-engine` or `SIANN_ENGINE_DIR=/path/to/siann-engine`
when the engine lives elsewhere.
