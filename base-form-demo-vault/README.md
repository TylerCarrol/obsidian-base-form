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
the view options. The main **Form** view also puts decrement and increment
buttons on the left and right of number fields.

The main **Form** view uses 50 notes per page. The three sample notes fit on one page.
With more than 50 matching notes, the **Previous** and **Next** buttons appear.
The **Notes per page** setting also supports 25, 100, and **All notes (slower)**.
Save changes before you change pages.

The **Conditional Show/Hide** view uses the `show-` prefix in Show mode. The
`show-score` note property shows Ada's score, hides Alan's score, and leaves
Grace's score visible because her controller is missing. The
`formula.show-appointment` controller follows `featured`, so appointments are
shown only for featured notes. The controller fields are not in the view order
and do not appear in the form.

The `Demo notes` folder contains three sample profiles. `Grace Hopper.md` includes empty optional values to demonstrate editing blank fields.
