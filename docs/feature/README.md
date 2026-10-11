# Delivery records

**These are not user documentation.** To use the package, start with the
[README](../../README.md) and the [documentation index](../README.md).

Each folder here records one larger piece of work on the package: its plan, and where the work
needed them, its brief, design notes and root-cause analysis. They were written while the work was
under way, using the nWave delivery method, and they are kept
as written: dated history, not a description of the package today. Test files cite them where a
test pins something the work found.

| Folder | The work |
|---|---|
| [`review-hardening/`](./review-hardening/plan.md) | July 2026: correctness, typing and test-coverage fixes from a review of the repository |
| [`drop-jest-cucumber/`](./drop-jest-cucumber/plan.md) | October 2026, version 3.0.0: replacing `jest-cucumber` with Jest and `@cucumber/gherkin`, as a dual ES module and CommonJS package |
| [`mutation-triage/`](./mutation-triage/plan.md) | October 2026: a verdict for every mutant that survived mutation testing, and tests for the behaviours they showed were unpinned |
