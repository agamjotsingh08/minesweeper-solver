# MineMind 1.1 — November 11, 2026

This release preserves the classic Windows-style game and adds a focused learning workflow.

## Added

- Five prediction-and-feedback lessons covering known mines, forced mines, subset subtraction, uncertainty, and the global mine count.
- An exhaustive small-position checker that constructs valid counterexamples instead of consulting a secret answer board.
- Proof coach for manual reveals, with cell-specific explanations and an explicit distinction between “unproved” and “mine.”
- JSON reasoning downloads and a local command-line reproduction check.
- A static distribution build and publishing guide.
- Project purpose, a focused comparison with existing tools, and a suggested future learner evaluation.

## Verification

- 16 automated tests cover solver rules, soundness across 150 generated boards, verified generation at all difficulties, all five teaching conclusions, opposing counterexamples, checker limits, coach decisions, and export contents.
- Syntax checks cover the game, engine, worker, reasoning module, and lessons module.
- Browser checks exercised incorrect and correct lesson answers, the two-world uncertainty explanation, coach blocking unproved/mine cells, allowing a proved-safe cell, and downloading a report.
- A downloaded report was reproduced successfully using the command-line verifier.
- The static build contains eight browser assets with relative URLs.

## Scope

Prepared for a first public demo. Source publication is separate from website deployment. No claim of unique invention, formal proof of all engine behavior, comprehensive browser/accessibility compatibility, or demonstrated educational benefit is made. Those require broader evaluation than these checks.
