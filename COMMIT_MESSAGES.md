# Commit message format

Use Conventional Commits for all commit messages.

Reference: https://www.conventionalcommits.org/en/v1.0.0/

## Required format

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

## Rules

- Use one of the standard types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Keep the description short, imperative, and lowercase (except proper nouns).
- Add a scope when it adds clarity, for example `feat(renderer): add overlap hatch spacing setting`.
- Mark breaking changes with `!` after type or scope, and include a `BREAKING CHANGE:` footer.
- Use footers for metadata such as issue references, for example `Refs: #123` or `Closes: #456`.

## Examples

```
feat(renderer): add overlap pattern spacing option
```

```
fix(metadata): handle missing frontmatter safely
```

```
refactor(shapes)!: simplify shape registration

BREAKING CHANGE: rename custom shape key from "polygon-v1" to "polygon".
```

```
docs(readme): clarify plugin install steps
```
