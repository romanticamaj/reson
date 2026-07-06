# Reson Bridge Examples

These fixtures are small command files for exploring the developer bridge CLI.

Run from the repository root:

```sh
npm test
node bin/reson-bridge.js run examples/bridge/create-session.command.json --json
node bin/reson-bridge.js validate-journal /tmp/reson-bridge-demo/create-session/journal.json --json
```

By default, the CLI expects the Ardour-derived engine checkout at `../reson-engine`.
Use `--engine-dir /path/to/reson-engine` or `RESON_ENGINE_DIR=/path/to/reson-engine`
when the engine lives elsewhere.
