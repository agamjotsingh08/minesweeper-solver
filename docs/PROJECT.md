# MineMind — Learn to prove, not guess

## The problem and the audience

Students can watch a solver finish a game without learning why its moves are justified. A correct click can also be lucky, and an unexplained hint does not teach the difference. MineMind is for beginners learning Minesweeper and students exploring knowledge representation, constraints, and the limits of inference.

The product addresses a small, concrete educational problem: **help a learner distinguish what the evidence proves from what merely could be true.** It is not a real-world mine detector or a universal AI decision system.

## The learning loop

1. Predict whether a target cell must be safe, must be a mine, or cannot yet be determined.
2. Get feedback grounded in the visible clues, not the hidden answer.
3. In an ambiguous exercise, inspect two complete mine arrangements that satisfy exactly the same clues but disagree about the target.
4. Apply the idea on a real board with Proof coach, which blocks unproved reveals without claiming they are necessarily wrong.
5. Export the visible evidence and deductions for reproducible discussion in class or a project demonstration.

The five small lessons use exhaustive enumeration independently of the game's deduction rules. The general game engine remains a bounded rule-based solver. These are deliberately different checks with different scopes.

## What differentiates this release

The focus is a connected teaching workflow: counterexample exercises, a coach that checks the learner's chosen cell, and exportable reasoning alongside a classic Windows-style game. It teaches uncertainty explicitly rather than treating a stalled solver as a failure to hide.

No claim of being the first or only implementation is warranted. No-guess play, explanations, hints, and probability solvers already exist:

- Minesweeper Online documents no-guess play and hints: https://minesweeper.online/help/gameplay
- Its pattern guide teaches constraint patterns: https://classic.minesweeper.online/help/patterns
- JohnnyDeuss provides a probabilistic solver: https://github.com/JohnnyDeuss/minesweeper-solver
- MinesweeperHQ provides an interactive solver with explanations: https://minesweeperhq.com/solver/

These sources were reviewed on November 11, 2026. This is a focused comparison, not an exhaustive market survey. The distinctive combination is a product positioning choice, not a proven novelty claim.

## Ready-to-use project description

I built MineMind to make logical reasoning visible and teach the difference between certainty and guessing. It combines classic Minesweeper with an explainable AI, a proof coach that prevents unsupported reveals, and interactive exercises that demonstrate uncertainty using two valid but conflicting mine arrangements. Learners can inspect constraints, replay decisions, and export reasoning without exposing the hidden board. The project applies knowledge representation, constraint solving, and exhaustive verification to an accessible educational problem.

## Claims and limits

- Verified boards are filtered until this specific solver can solve them from the supplied opening. Arbitrary boards may stall.
- Manual play outside coach mode can lose. Coach checks the current bounded rule set; it can block a move a stronger solver could prove.
- The lesson checker exhausts at most 18 unknown cells. It is not run on full expert boards.
- Reports are conditional on supplied clues and known mines. The verifier re-runs the same inference engine; it is not a separate theorem prover or a cryptographic attestation.
- Lesson completion is stored locally and is not an assessment of mastery. Educational effectiveness has not been measured with learners.
- No accounts, analytics, backend, or paid APIs are used. Local storage is not encrypted, and the game owns the hidden board in browser memory; the solver API, not the browser user, is denied those positions.

## Suggested evaluation after publication

Ask volunteers to classify a new ambiguous position before and after the lessons. Track whether they can explain why two valid counterexamples defeat a certainty claim. Collect consent before collecting any participant data. Report sample size and limitations rather than claiming learning gains from game win rate.
