# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.0] - 2026-09-04

### Added

- Add an optional manual submit button for forms that show only empty properties.

### Fixed

- Resolve unsafe return and call warnings in suggestion label parsing.

## [0.6.4] - 2026-09-03

### Fixed

- Addressed various warnings for DOM helpers, unsafe suggestion values, CSS selectors, and vault-wide file enumeration.

## [0.6.3] - 2026-09-03

### Changed

- Fixed Funding URL

## [0.6.2] - 2026-09-02

### Added

- Funding URL

## [0.6.1] - 2026-09-02

### Fixed

- Fix grouping so it respects Bases `groupBy` configuration and renders grouped sections like the built-in Obsidian views.

## [0.6.0] - 2026-08-12

### Added

- Add a delete property button toggle for frontmatter fields in the Form view.

## [0.5.0] - 2026-08-09

### Added

- Autocomplete in text and list fields

### Changed

- Improved list aesthetics

## [0.4.0] - 2026-08-09

### Changed

- Rename the property visibility filters to hide non-empty and hide non-existent properties, and keep formula properties visible.

## [0.3.0] - 2026-08-09

### Added

- Render markdown links in text and list input fields

## [0.2.0] - 2026-08-09

### Added

- Add a Form view option to show only existing property inputs, with support for combining it with the empty-input filter.

## [0.1.1] - 2026-08-08

### Fixed

- Fix CSS lint warnings by replacing `!important` usage and `:has()` in list-chip/list-control styles.

## [0.1.0] - 2026-08-08

### Added

- Add an editable Form view for Obsidian Bases.
- Support text, list, number, checkbox, date, and date-and-time properties.
- Add per-view file name visibility, empty-input filtering, item spacing, and form width options.
- Add a demo base and sample notes covering each supported property type.

[Unreleased]: https://github.com/TylerCarrol/obsidian-base-form/compare/v0.7.0...HEAD

[0.7.0]: https://github.com/TylerCarrol/obsidian-base-form/compare/v0.6.4...v0.7.0

[0.6.4]: https://github.com/TylerCarrol/obsidian-base-form/compare/v0.6.3...v0.6.4

[0.6.3]: https://github.com/TylerCarrol/obsidian-base-form/compare/v0.6.2...v0.6.3

[0.6.2]: https://github.com/TylerCarrol/obsidian-base-form/compare/v0.6.1...v0.6.2

[0.6.1]: https://github.com/TylerCarrol/obsidian-base-form/compare/v0.6.0...v0.6.1

[0.6.0]: https://github.com/TylerCarrol/obsidian-base-form/compare/v0.5.0...v0.6.0

[0.5.0]: https://github.com/TylerCarrol/obsidian-base-form/compare/v0.4.0...v0.5.0

[0.4.0]: https://github.com/TylerCarrol/obsidian-base-form/compare/v0.3.0...v0.4.0

[0.3.0]: https://github.com/TylerCarrol/obsidian-base-form/compare/v0.2.0...v0.3.0

[0.2.0]: https://github.com/TylerCarrol/obsidian-base-form/compare/v0.1.1...v0.2.0

[0.1.1]: https://github.com/TylerCarrol/obsidian-base-form/compare/v0.1.0...v0.1.1

[0.1.0]: https://github.com/TylerCarrol/obsidian-base-form/releases/tag/v0.1.0
