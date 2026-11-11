# MineMind — Learn to prove, not guess

**An explainable Minesweeper solver and reasoning tutor that teaches the difference between a mathematical proof and a lucky guess.** Play in a classic Windows-style interface, inspect the AI's constraints, and learn when the available evidence is not enough to justify a move. Built with JavaScript modules, CSS, and native Web Workers; no API keys or runtime packages required.

## What problem does it solve?

MineMind addresses **two connected problems: constraint solving and learning to reason under uncertainty.**

### 1. The mathematical problem: what follows from incomplete information?

Each hidden cell is a binary variable: `x = 1` means mine and `x = 0` means safe. A revealed clue imposes an exact sum on its neighboring variables. For example:

```text
A + B = 1       Exactly one of A and B is a mine.
A + B + C = 1   Exactly one of A, B, and C is a mine.
Subtract: C = 0 Therefore C is safe, without guessing.
```

The task is to determine which cells must be safe or must contain mines given the visible constraints. The game solver applies direct rules, the total mine count, and subset subtraction. The small teaching exercises separately enumerate every valid arrangement to check whether a conclusion holds in all of them.

Sometimes the evidence permits multiple answers. If `A + B = 1` is the only relevant information, both `(A=1, B=0)` and `(A=0, B=1)` are valid. MineMind shows those opposing arrangements to demonstrate why neither cell can be declared safe with certainty.

**This is an application of a known constraint-satisfaction problem, not a solution to an unsolved mathematical problem.** The bounded game solver does not solve every possible Minesweeper board. A stalled solver may lack a sufficiently strong rule; a demonstrated pair of opposing valid arrangements establishes genuine uncertainty about that cell.

### 2. The learning problem: a correct answer does not explain itself

Watching an AI finish a board or clicking a lucky safe cell does not teach why a decision was justified. MineMind lets beginners and students predict a conclusion, inspect its evidence, see counterexamples, and practice on a real board. The aim is to make reasoning inspectable; improved learning outcomes have not yet been measured in a user study.

## What makes MineMind distinctive?

**Its focus is teaching justified decisions, not only completing a board.** The distinguishing feature is a connected workflow:

| Feature | What the learner can do |
| --- | --- |
| Counterexample lessons | Inspect two valid mine arrangements that disagree about the same target cell and understand why certainty is impossible. |
| Proof coach | Have a chosen cell checked before revealing it; an unproved move is blocked and explained rather than silently treated as safe. |
| Transparent knowledge base | Read the constraints and evidence supporting the AI's next deduction. Human flags are annotations, not trusted facts. |
| Reasoning exports and verifier | Download public observations and deductions, then reproduce the result locally without exporting the hidden board or seed. |
| Verified boards and honest stopping | Practice on boards this solver can finish, or use random boards where the AI stops when its rules cannot justify another move. |

No-guess modes, hints, and solvers already exist. MineMind does **not** claim to be the first, the only, or universally better solver. Its distinctive product focus is the combination of counterexamples, proof coaching, and reproducible explanations in an approachable game. See the [comparison and limitations](docs/PROJECT.md).

## New in 1.1

- **Learn:** five interactive lessons, including two valid but opposing mine arrangements that demonstrate uncertainty.
- **Proof coach:** checks the cell you choose and blocks manual reveals without a current proof of safety.
- **Reasoning exports:** download public observations and deductions without revealing the hidden board or seed.
- **Report verifier:** reproduce an export with `npm run verify-report -- report.json`.
- **Static build:** `npm run build` prepares eight deployable assets in `dist/` without publishing anything.

Read [the project purpose and differentiation](docs/PROJECT.md) and [publishing instructions](docs/PUBLISHING.md). No-guess play and hints exist elsewhere; this project's focus is its teaching workflow, not a claim to be the first Minesweeper solver.

## Run locally

Install Node.js 20 or newer, then run:

```sh
npm start
```

Open http://127.0.0.1:4173. Do not open `index.html` directly: module workers need an HTTP server. Use `PORT` to override the default port. `npm test` runs the inference tests, and `npm run check` checks JavaScript syntax.

## Features

- Responsive, keyboard-accessible game with three difficulty levels and touch flag mode.
- Deterministic seeds and shareable board URLs.
- Verified no-guess generation, performed off the main thread.
- Unfiltered classic boards that honestly stop when deduction stalls.
- Autoplay with adjustable speed, single-round stepping, and non-destructive hints.
- Live knowledge base, explicit proof evidence, reasoning journal, and replay timeline.
- Automatic local progress saving, including history; no account or backend required.
- Reproducible 30-board benchmark on unfiltered random boards.
- Unit and multi-board soundness tests using Node's built-in test runner.

## How the AI works

The game engine owns the hidden board. `observe()` exposes only revealed clues, board dimensions, total mines, and mines already proved by the solver. The `infer()` function has no access to hidden clues, seed, or mine locations. Human flags are deliberately excluded from inference.

A constraint is a set of hidden cells and an exact mine count. A revealed clue generates a constraint after accounting for proved adjacent mines. The global mine count adds another constraint. The solver uses three rules:

1. A count of zero proves every cell in the set safe.
2. A count equal to the set size proves every cell a mine.
3. If set A is contained in set B, subtracting A from B yields a new constraint with count B − count A.

One **Step** applies a batch of current deductions, including empty-region expansion. It is not necessarily one cell click. The inspector displays the first available proof; the knowledge base contains all currently derived constraints. Inference is bounded at five subset passes and 450 constraints. These bounds and the rule set make the engine incomplete: stalled does not mean mathematically impossible.

## The no-guess guarantee

Ordinary Minesweeper can require guesses. This project does not claim to solve every arbitrary board. Both modes supply a safe central opening. Verified mode generates seeded candidates and runs the same solver from that opening until it finds a board the solver clears entirely. After 300 candidates it reports failure rather than making a false guarantee. Classic mode returns the first unfiltered candidate.

Certification uses hidden positions to simulate clue revelation, just as normal gameplay does. **Inference does not.** A human can still lose a verified board by revealing an unproved mine. The generator's certificate guarantees the solver's route from the supplied opening, not that every possible click is safe.

Benchmarks use 30 fixed, unfiltered seeds, so completion rates measure the engine's deduction coverage rather than the generator's filtering. Hardware affects timing. Seeds are reproducible for this engine version.

## Files

| File | Responsibility |
| --- | --- |
| `engine.js` | Board creation, public observations, constraint inference, solve certification |
| `worker.js` | Background generation and benchmarks |
| `app.js` | Gameplay, UI state, replay, local persistence |
| `reasoning.js` | Small-position exhaustive checks, coach assessments, public reasoning reports |
| `lessons.js` | Interactive lesson questions, feedback, and counterexample views |
| `scripts/build.mjs` | Packages the eight public assets into `dist/` |
| `scripts/verify-report.mjs` | Reproduces deductions from an exported observation |
| `style.css` | Responsive visual system |
| `server.mjs` | Local development server bound to loopback |
| `test/engine.test.js` | Rules, edge cases, determinism, and soundness tests |
| `test/reasoning.test.js` | Lesson conclusions, counterexamples, coach safety, and report contents |

The interface uses system fonts and local SVG graphics; it requires no external assets. Progress is stored in this browser's localStorage. Clearing site data removes it. A shared link recreates the initial board, not the saved move history. Localhost links work for someone else only if they run the app locally on the same port; a deployed copy would use its public URL.

## Repository

Source: [agamjotsingh08/minesweeper-solver](https://github.com/agamjotsingh08/minesweeper-solver).

No environment files, credentials, personal exports, or saved player sessions are needed to run the project. Game progress stays in the browser's localStorage. See [publishing instructions](docs/PUBLISHING.md) for preparing a static website; pushing the source repository does not deploy it automatically.
