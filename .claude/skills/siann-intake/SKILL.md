---
name: siann-intake
description: Use when a user gives audio files, folders, zip packs, placement notes, cue sheets, or natural-language arrangement instructions and wants a Cubase-importable DAWproject or SIANN session. The skill converts arbitrary input into a SIANN manifest, then triggers deterministic SIANN bridge/export commands.
---

# SIANN Intake

This project mirrors the repo-local Codex skill at
`.codex/skills/siann-intake/SKILL.md`.

When this skill is invoked, follow that canonical file exactly. The core
boundary is:

```text
raw audio + notes + user intent
-> AI intake reasoning
-> siann.import_pack.v0 manifest
-> deterministic SIANN CLI / bridge / engine / exporter
```

Do not treat fixed layouts such as `_DAW/` and `_SpliceSFX/` as the product
contract. They are examples only. The AI planner owns arbitrary input
interpretation; SIANN deterministic commands own validation, export, render,
journal, and rollback.

