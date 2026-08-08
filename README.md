# {{RENAME}} Plugin for Obsidian

[![GitHub Release](https://img.shields.io/github/v/release/TylerCarrol/obsidian-{{RENAME}}?logo=github&sort=semver)](https://github.com/TylerCarrol/obsidian-{{RENAME}}/releases/latest) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/TylerCarrol/obsidian-{{RENAME}}/blob/main/LICENSE) [![Lint](https://github.com/TylerCarrol/obsidian-{{RENAME}}/actions/workflows/lint.yml/badge.svg)](https://github.com/TylerCarrol/obsidian-{{RENAME}}/actions/workflows/lint.yml) [![Test](https://github.com/TylerCarrol/obsidian-{{RENAME}}/actions/workflows/test.yml/badge.svg)](https://github.com/TylerCarrol/obsidian-{{RENAME}}/actions/workflows/test.yml)

## Install for development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the plugin:
   ```bash
   npm run build
   ```
3. Copy `main.js`, `manifest.json`, and `styles.css` to:
   ```text
   <Vault>/.obsidian/plugins/{{RENAME}}/
   ```
4. In Obsidian, enable **Settings → Community plugins → {{RENAME}}**.

For watch mode during development:

```bash
npm run dev
```

## Fastest way to try it

This repository includes a ready-made demo vault in `/{{RENAME}}-demo-vault`.

- Windows/PowerShell:
  ```powershell
  .\scripts\build-to-demo-vault.ps1
  ```
- Any platform:
  1. Run `npm run build`
  2. Copy `main.js`, `manifest.json`, and `styles.css` to `{{RENAME}}-demo-vault/.obsidian/plugins/{{RENAME}}/`
  3. Open `{{RENAME}}-demo-vault` in Obsidian

See `{{RENAME}}-demo-vault/README.md` for a guided walkthrough.
