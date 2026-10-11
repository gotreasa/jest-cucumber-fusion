# Delivery records

**These are not user documentation.** To use the package, start with the
[README](../../README.md) and the [documentation index](../README.md).

Each folder holds the plan for one larger piece of work on the package and, where the work needed
them, its brief, design notes and root-cause analysis. They were written while the work was under
way, using the nWave delivery method (an agent-assisted way of planning and reviewing work). A
closed record is kept as it stood when the work closed, with any later note marked as one; a
record whose work is still open is a living plan. Either way they are dated history, not a
description of the package today. Test files cite them where a
test pins something the work found.

| Folder | The work |
|---|---|
| [`review-hardening/`](./review-hardening/plan.md) | July 2026: correctness, typing and test-coverage fixes from a review of the repository |
| [`drop-jest-cucumber/`](./drop-jest-cucumber/plan.md) | October 2026, version 3.0.0: replacing `jest-cucumber` with Jest and `@cucumber/gherkin`, as a dual ES module and CommonJS package |
| [`mutation-triage/`](./mutation-triage/plan.md) | October 2026: a verdict for every mutant that survived mutation testing, and tests for the behaviours they showed were unpinned |
| [`docs-review-2026-10-11/`](./docs-review-2026-10-11/plan.md) | October 2026: acting on an adversarial review and a pedagogy review of this documentation |
