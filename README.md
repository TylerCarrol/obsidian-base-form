# BaseForm

BaseForm adds an editable **Form** view to [Obsidian Bases](https://help.obsidian.md/bases). It displays each note returned by a base as a card with its selected properties stacked vertically.

## Demo vault

The repository includes `base-form-demo-vault`, with a configured base and sample notes covering every supported property type. See [`base-form-demo-vault/README.md`](base-form-demo-vault/README.md) for the walkthrough.

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
   <Vault>/.obsidian/plugins/base-form/
   ```
4. Enable **Settings → Community plugins → BaseForm**.

For watch mode, run `npm run dev`. On Windows, `.\scripts\build-to-demo-vault.ps1` builds and installs the plugin into the included demo vault.

## Validate changes

```bash
npm run lint
npm test
npm run build
```

## Privacy

BaseForm works locally. It does not make network requests, collect analytics, or send vault data anywhere.
