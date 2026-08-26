<p align="center">
  <img src="assets/banner.png" alt="Skill Intake Engine" width="860">
</p>

<h1 align="center">Skill Intake &amp; Integration Engine</h1>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
  <a href="https://clawhub.ai"><img src="https://img.shields.io/badge/OpenClaw-plugin-6d5efc?style=for-the-badge" alt="OpenClaw plugin"></a>
  <a href="https://github.com/pmuhammadagus-byte/openclaw-skill-intake-engine/commits/master"><img src="https://img.shields.io/badge/status-published-brightgreen?style=for-the-badge" alt="Status"></a>
</p>

A native OpenClaw plugin that acts as a **safety gate** for incoming skills: it analyzes, validates, and prepares skills for integration — **without ever installing or executing them**.

<p align="center">
  <a href="https://clawhub.ai">ClawHub</a> ·
  <a href="#installation">Installation</a> ·
  <a href="#tools">Tools</a> ·
  <a href="LICENSE">License</a>
</p>

## What it does

- 🔍 Analyzes a local skill **without executing it**.
- 🛡️ Detects common **shell / network / credential / destructive** signals (and redacts `sk-`, `ghp_`, passwords, private keys).
- 🚫 Detects simple **prompt-injection** phrases.
- ✅ Checks basic **skill structure** (presence of `SKILL.md`, etc.).
- 📋 Creates **normalized registry metadata** for reviewed skills.
- 🔒 **Never installs or enables a skill automatically** — it's a gate, not an executor.

## How it works (high level)

- `skill_intake_analyze` reads a skill file/directory (capped at `maxReadBytes`), redacts secrets, and scores risk (LOW / MEDIUM / HIGH) from detected capability signals.
- `skill_intake_validate` performs structural checks (recommended files present) without running anything.
- `skill_intake_registry_entry` emits a metadata-only registry record — no install, no enable.

## Installation

```bash
# from ClawHub (after public publish)
openclaw plugins install clawhub:pmuhammadagus-byte/openclaw-skill-intake-engine

# or build from source
npm install
npm run plugin:build
npm run plugin:validate
openclaw plugins install .
openclaw plugins enable skill-intake-engine
```

Restart/reload the Gateway after installation.

## Tools

| Tool | Purpose |
|------|---------|
| `skill_intake_analyze` | Analyze a local skill (risk + capabilities + injection signals), non-executing. |
| `skill_intake_validate` | Structural validation of a skill directory. |
| `skill_intake_registry_entry` | Create a normalized registry record from metadata. |

## Important

This plugin is intentionally a **safety gate**, not an automatic arbitrary-code executor. It does **not** claim a skill is safe merely because the scan passes. For production use, add a real sandbox runner and policy engine appropriate to the host.

## Repo layout

- `src/index.ts` — TypeScript source.
- `dist/index.js` — built entry point (used at runtime).
- `openclaw.plugin.json` — plugin manifest (id, contracts, activation).
- `package.json` — metadata + `openclaw` extension config.
- `tsconfig.json` — build config.
- `assets/banner.svg` + `assets/banner.png` — README hero.
- `LICENSE` — MIT.

## Notes

- Requires OpenClaw `>=2026.5.17`.
- Replace `<owner>` in examples with your ClawHub handle.

## License

[MIT](LICENSE) — free to use and modify.

---

<div align="center">

Made with Clara ✨ · OpenClaw plugin · secure by design

</div>
