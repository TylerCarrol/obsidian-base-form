# BaseForm demo vault

This vault demonstrates the BaseForm custom Bases view with text, linked text, linked list items, number, checkbox, date, and date-and-time properties.

## Try the form

1. Build and install the plugin:
   - On Windows, run `.\scripts\build-to-demo-vault.ps1` from the repository root.
   - On other platforms, run `npm run build`, then copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/base-form/`.
2. Open this folder as an Obsidian vault.
3. Confirm that **Settings → Core plugins → Bases** and **Settings → Community plugins → BaseForm** are enabled.
4. Open `Form demo.base`.
5. Select the **Form** view and edit the fields. Move focus away from a field to save it.
6. Select the **Table** view to see the same notes in Obsidian's built-in layout.

List values are entered one item per line. Linked values use note links so you can
see the autocomplete and the link-style display in the form. The main **Form**
view uses the default compact spacing and visible file names. The embedded
**This - Form** view hides the file name and uses tighter spacing to demonstrate
the view options.

The `Demo notes` folder contains three sample profiles. `Grace Hopper.md` includes empty optional values to demonstrate editing blank fields.
