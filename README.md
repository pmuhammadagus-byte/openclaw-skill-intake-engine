# OpenClaw Skill Intake & Integration Engine

A native OpenClaw plugin for receiving and evaluating skills before integration.

## What it does

- analyzes a local skill without executing it
- detects common shell/network/credential/destructive signals
- detects simple prompt-injection phrases
- checks basic skill structure
- creates normalized registry metadata
- never installs or enables a skill automatically

## Install

```bash
npm install
npm run plugin:build
npm run plugin:validate
openclaw plugins install .
openclaw plugins enable skill-intake-engine
```

Restart/reload the Gateway after installation.

## Important

This plugin is intentionally a safety gate, not an automatic arbitrary-code executor.
It does not claim that a skill is safe merely because the scan passes.
For production use, add a real sandbox runner and policy engine appropriate to the host.

## Tools

- `skill_intake_analyze`
- `skill_intake_validate`
- `skill_intake_registry_entry`
