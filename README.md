# BaseForm

BaseForm adds an editable **Form** view to [Obsidian Bases](https://help.obsidian.md/bases). It displays each note returned by a base as a card with its selected properties stacked vertically.

## Features

- Edit text, list, number, checkbox, date, and date-and-time properties.
- Save changes directly to note frontmatter through Obsidian's file API.
- Respect the visible property order and display names configured in the Bases toolbar.
- Display every matching note as a separate form.
- Show or hide file names, show only empty property inputs, and adjust item spacing for each Form view.
- Show file and formula properties as read-only values.
- Work on desktop and mobile without external services.

## Requirements

- Obsidian 1.13.0 or later.
- The **Bases** core plugin must be enabled.

## Use

1. Install and enable BaseForm.
2. Open or create a `.base` file.
3. Add a view and select **Form**.
4. Use **Properties** in the Bases toolbar to choose and reorder the form fields.
5. Use the view options to show or hide file names, show only empty property inputs, and adjust item spacing.
6. Edit a field, then move focus away from it to save the value.

List fields use one item per line. Clearing a number, date, or date-and-time field keeps the property with an empty value. File and formula properties remain visible but cannot be edited.

BaseForm uses Obsidian's assigned property types when available. If an untyped property is empty in every matching note, it initially falls back to a text field.

Values that cannot be safely represented by a supported input, including nested data, non-text lists, and date-and-time values with timezone suffixes, are shown read-only to prevent accidental data loss.

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
