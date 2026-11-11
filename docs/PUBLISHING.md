# Publishing MineMind

The application is a static website. This release prepares a deployable folder but does not publish anything automatically.

## Release checks

```sh
npm test
npm run check
npm run build
```

The `dist/` directory contains only the eight required public assets. It excludes source tests, reports, local Git metadata, and documentation. All browser asset paths are relative, including worker and module imports, so the site can run beneath a repository subpath.

Upload the contents of `dist/` to a static HTTPS host of your choice when ready. No server command or environment secrets are needed on the host. Serve JavaScript as JavaScript (not as an HTML fallback). Keep all eight files together. After deployment, check an initial board, a Learn exercise, coach mode, a seed link, and an export. The local Node server is a development server, not a production hosting service.

## GitHub connection

The source repository is `https://github.com/agamjotsingh08/minesweeper-solver.git`. Publishing source code there is separate from deploying the website. The build command does not push code or deploy assets automatically.

## Before a public release

- Choose your preferred code license; this project does not grant a license on your behalf.
- Review README and the project positioning in `docs/PROJECT.md`.
- Use your own screenshots. The UI is a recreation using local CSS/SVG, not extracted Windows assets. It is not affiliated with Microsoft.
- Describe the existing custom board sizes accurately (9×9/10, 12×12/24, 16×16/48); these are not all the historical Windows presets.
- Make only evidence-supported claims. There has been no exhaustive comparison with every Minesweeper project and no formal accessibility or educational efficacy audit.

## Reproducing a reasoning export

```sh
npm run verify-report -- path/to/minemind-reasoning.json
```

Exports include public clues and already-proved mines, which are sufficient to reconstruct that inference step. They intentionally exclude the hidden board and seed. They do not recreate an entire game. They can be edited by their owner; the verifier checks deductions against the supplied observations, not where those observations came from.
