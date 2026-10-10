## Shared contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with no jest-cucumber

### Purpose (Shared contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with no jest-cucumber)

Fix the one feature-level contract every value of this Request consumes: the
exact CommonJS cucumber dependency line that replaces jest-cucumber, the module
decomposition and the two driven ports that take over the lifecycle
jest-cucumber owns today, the configuration merge order, how the Gherkin keyword
is recovered after pickles discard it, the step-argument shape handed to a
consumer step function, the internal test seam that replaces mocking
jest-cucumber, and the error texts that must stay byte-identical across the
major.

### Constraints (Shared contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with no jest-cucumber)

- The package stays CommonJS with no build step: main is src/index.js and a
  consumer requires it from a .steps.js file under their own Jest, so every
  dependency must be loadable by require inside Jest 30 on Node 22.
- Dependencies are pinned to the last CommonJS-loadable cucumber line:
  @cucumber/gherkin 39.1.0, @cucumber/messages 32.3.1 and
  @cucumber/tag-expressions 9.1.0. The newer majors publish ESM only and Jest 30
  on Node 22 cannot require them.
- jest-cucumber is removed from dependencies and no file under src/ may require
  it.
- A consumer production dependency tree must hold no path to uuid, which is the
  outcome the Request exists for (GHSA-w5hq-g745-h8pq, Dependabot alert 1).
- For every suite in the 2.0.0 baseline that calls Fusion on a feature file, the
  describe title and the ordered list of test names Fusion generates stay
  byte-identical: describe is the feature title, one test per scenario, one test
  per outline Examples row with the angle-bracket variables substituted into the
  title, and repeated titles stay repeated in the same positions. The single
  ruled exception is scenarioNameTemplate on outline rows. Test files that do
  not call Fusion on a feature file, and suites added by a later value, are
  outside this comparison.
- The failing-step error text stays byte-identical to 2.0.0: the line Failing
  step: followed by the step text in double quotes, then the line Step
  arguments: followed by the JSON of the arguments, then the line Error:
  followed by the original message.
- A missing feature file keeps the message Feature file not found followed by
  the absolute path in parentheses, with the resolved base directory appended as
  a HOW.
- Fusion must complete synchronously at module load, because it has to register
  describe and test during the Jest collection phase; no deferred registration
  and no dynamic import.
- Before and After hooks are registered once per feature, inside that feature
  describe block, never once per scenario block.
- Fusion always leaves the module registry empty, on normal return and on throw
  alike.
- Steps run sequentially and each returned promise is awaited, a responsibility
  jest-cucumber owns today and Fusion inherits with nothing to fall back on.
- No step function receives a done callback, because all three current wrapper
  shapes already report arity 0 and so suppress the jest-cucumber done-callback
  heuristic for every consumer.
- loadRelativePath stays accepted as a typed no-op and runner is removed from
  the public types.
- The paradigm stays procedural: plain CommonJS functions over a module-level
  registry, with no classes introduced to fit a label.
- The whole repository suite exits 0 at every value, and that run is the
  falsifier for risk R4, the deleted outline heuristic.
- No new public export beyond setFusionConfiguration, and no pending verb.

### Targets (Shared contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with no jest-cucumber)

| Path | Decision | Reason |
|---|---|---|
| `package.json` | EXTEND | Remove jest-cucumber from dependencies (package.json:25) and add the exact pins for @cucumber/gherkin, @cucumber/messages and @cucumber/tag-expressions. jest.testMatch (package.json:74) already selects every .steps.js file, so the new arch, contract and shared-contract oracles are discovered with no discovery change. |
| `package-lock.json` | EXTEND | npm ci in a clean checkout resolves from the lock, so the pinned cucumber line and the absence of every uuid path must be recorded here or the first verification vector fails. |
| `src/index.js` | EXTEND | Stays the public surface and the Fusion orchestration but loses the outline heuristic (src/index.js:284-437), the jest-cucumber require (src/index.js:114) and the defineFeature call (src/index.js:133). Keeps the registry (src/index.js:14), the verbs, the duplicate-matcher guard and the unconditional reset, and gains setFusionConfiguration. |
| `src/index.d.ts` | EXTEND | The jest-cucumber type import (src/index.d.ts:7) and the options type derived from it (src/index.d.ts:34) both die with the dependency. Declare the options interface locally, drop runner, keep loadRelativePath as a documented no-op and add setFusionConfiguration. |
| `src/configuration.js` | CREATE_NEW | No module under src/ owns option defaults or the merge today; the jest-cucumber configuration module does, and it is leaving. Owns the defaults, the global object set by setFusionConfiguration, the merge order defaults then global then per-call, and the normalisation of errors true into the three-key object. |
| `src/feature-source.js` | CREATE_NEW | Driven port for everything outside the process boundary: resolve the caller directory through callsites, read the feature bytes, parse with @cucumber/gherkin, compile pickles, build the astNodeId to keyword index, shape step arguments and apply the tag filter, returning one internal LoadedFeature value. It is the only module allowed to require node:fs or @cucumber/gherkin, and it is half of the test seam that replaces mocking jest-cucumber. |
| `src/keywords.js` | CREATE_NEW | Pickles discard the Gherkin keyword: PickleStep.type carries only Context, Action or Outcome, and a probe on the installed compiler showed an And step arriving as Context. The Fusion registry is keyed by keyword (src/index.js:21, looked up at src/index.js:236-238), so this module maps an AST step keyword through the Gherkin dialects onto exactly one of given, when, then, and, but, replacing the 68-line positional translation map in jest-cucumber. |
| `src/step-argument.js` | CREATE_NEW | A pickle hands back a dataTable of rows of cells, or a docString with content, but a consumer step function receives an array of header-keyed row objects or a plain string. That transform belongs to jest-cucumber today (parsed-feature-loading.js:33-63) and must be owned here, preserving the empty string and the empty array as real values. |
| `src/step-matching.js` | CREATE_NEW | Receives the matching and capture-injection code extracted from src/index.js:235-282 and src/index.js:439-489 by the declared prefactoring move, then loses the outline heuristic because pickle step text is already substituted. Owns lookup within one keyword bucket, the ambiguous-step refusal and capture extraction. |
| `src/test-registration.js` | CREATE_NEW | Driven port over the Jest globals, taking over what the jest-cucumber defineFeature does today (feature-definition-creation.js:119-159 and 222-238): one describe per feature title, no describe at all for a feature with no scenarios, hooks registered once inside that describe, one test or skipped test per pickle, steps awaited in order, and the byte-identical failing-step decoration. It is the other half of the test seam. |
| `src/tag-filter.js` | CREATE_NEW | Wraps @cucumber/tag-expressions 9.1.0 and lowercases both the expression and the scenario tag set, so tag matching stays case-insensitive as the hand-rolled rewriter in jest-cucumber (tag-filtering.js:5-55) made it. Created here because the module boundary is part of the shared decomposition; the tagFilter behaviour lands at its own value. |
| `src/code-suggestion.js` | CREATE_NEW | Emits starter code in the Fusion verb idiom for an unmatched step, replacing the jest-cucumber code generation which emits its own test callback shape (code-generation/scenario-generation.js:7 and step-generation.js:7). Created here because the module boundary is shared; the message and the errors semantics land at their own value. |

### Paradigm (Shared contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with no jest-cucumber)

procedural

### Decisions (Shared contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with no jest-cucumber)

- Fusion takes over the whole lifecycle it delegates to jest-cucumber today:
  reading and parsing the feature, expanding outlines, registering describe and
  test, running steps in order, decorating failures, tag filtering, name
  templates, validation and starter-code generation.
- Gherkin pickles own expansion. Compiling the document gives one pickle per
  Examples row with the title, the step text and every data-table cell already
  substituted, with Background and Rule backgrounds collapsed in and feature,
  scenario and Examples tags unioned. A probe on the installed compiler
  confirmed all of it.
- Closing L5 needs no production logic beyond using pickles: the same probe
  showed an empty docstring inside an outline row surviving as a docString whose
  content is the empty string, while jest-cucumber nulls it on a truthiness test
  (parsed-feature-loading.js:96-97) before Fusion is ever called.
- Pickles discard the Gherkin keyword, so the keyword is recovered per step
  through PickleStep.astNodeIds into the parsed AST and mapped through the
  Gherkin dialects. One parse serves both, and non-English dialects fall out of
  the same lookup.
- The keyword-to-bucket map is total and deterministic: the AST keyword is
  trimmed and resolved against the dialect lists in the fixed order given, when,
  then, and, but, and the first list holding it wins, so a dialect that spells
  one word in two lists still yields exactly one bucket.
- An asterisk step, which every Gherkin dialect allows, raises a named refusal
  stating the unsupported keyword. Today it crashes with a bare TypeError,
  because findMatchingStep calls Object.keys on an undefined bucket
  (src/index.js:238) and no feature in the repository uses one. The cure is in
  the representation rather than a guard: src/keywords.js returns one of exactly
  five buckets or a refusal, so an invalid keyword can no longer reach the
  registry lookup.
- The outline matching heuristic (src/index.js:284-437) is deleted. Because
  pickle step text is concrete, an outline step is bound by ordinary matching,
  and a row whose substituted text does not fit a definition regex becomes a
  loud unmatched step instead of running with no captures.
- Capture extraction moves inside Fusion for every scenario, outline rows
  included, through the existing injectVariable path (src/index.js:439-489),
  rather than being handed to jest-cucumber to re-match per row
  (feature-definition-creation.js:120-131).
- The step argument is forwarded on presence, never on type or truthiness, so an
  empty docstring and a header-only data table both reach the step function.
  This preserves the L3 fix recorded at src/index.js:476-483.
- The jest-cucumber done-callback heuristic is dropped with no observable
  change: all three current wrapper shapes report arity 0 (src/index.js:456, 467
  and 487), so the heuristic at feature-definition-creation.js:132 is already
  always false for a Fusion consumer. The rest-parameter workaround and its
  comment go with it.
- The jest-cucumber pending source sniff (feature-definition-creation.js:85-100)
  is dropped and no pending verb is added. A consumer whose step body merely
  contains the text of a pending call is silently skipped today and will now
  run.
- Option merging is owned by src/configuration.js with the order defaults then
  global then per-call, and errors true is normalised to the three-key object
  exactly as the jest-cucumber configuration module does at
  configuration.js:30-34.
- Of the three errors keys only stepsMustMatchFeatureFile governs a live
  behaviour under Fusion, because Fusion generates the scenario definitions from
  the feature file itself. scenariosMustMatchFeatureFile is narrowed to its one
  real residue, rejecting a feature file with two same-titled scenarios, at
  collection time for the whole file. allowScenariosNotInFeatureFile is accepted
  and vestigial, like loadRelativePath.
- The failing-step decoration and the missing-feature-file message are owned by
  Fusion and stay byte-identical, because they are the shape of every failure in
  every consumer suite today. The Gherkin parse-error wording is preserved for
  the same reason.
- A feature with no scenarios registers no describe at all and therefore no
  hooks, exactly as jest-cucumber short-circuits at
  feature-definition-creation.js:230-233. The M6 fix depends on this.
- The byte-identical name contract is scoped to the names Fusion generates from
  feature files, not to every name in the repository.
  test/specs/baseline/test-names-2.0.0.txt records, for each 2.0.0 suite that
  calls Fusion on a feature file, that suite file path, its describe title and
  its ordered list of generated test names with repeats kept in place.
  assert-test-names.js passes only when every baseline suite is still present
  and still produces an identical ordered list. Test files that do not call
  Fusion on a feature file are internal regression tests whose own names are
  deliberately rewritten by the D10 seam migration, so they are excluded; suites
  added by a later value are excluded because they have no baseline entry.
  Neither exclusion weakens the consumer-visible promise, which is about what
  Fusion generates from a given feature file.
- src/feature-source.js and src/test-registration.js are the internal test seam
  that replaces mocking jest-cucumber. They are internal module paths and not
  public exports: the dropped runner option is not reintroduced under another
  name.
- The eight test files that mock jest-cucumber migrate by seam rather than by
  rewrite: m1-before-hooks-clobber and hook-error mock test-registration to
  observe hook wiring; m3-singleton-reset, m5-errors-false-silent-skip and
  ambiguous-step-shadowing mock both seams; m4-callsite-resolution mocks
  feature-source to observe the resolved path and keeps its callsites mock;
  l2-outline-edge-cases and l4-escaped-parens-outline stop using a fake entirely
  and move to real feature files, because the deleted heuristic was the only
  reason they needed one; m2-duplicate-matcher never mocked anything and is
  untouched. None of these files calls Fusion on a committed feature file in the
  2.0.0 baseline, so their own test names are outside the name comparison.
- Dependency direction is inward and is enforced as an architectural law rather
  than prose: no module under src/ requires jest-cucumber; only
  src/feature-source.js requires @cucumber/gherkin, @cucumber/messages, node:fs
  or callsites; only src/test-registration.js touches a Jest global; and the
  pure core modules require none of them.
- The Gherkin pickle API and pickle shape is a contract with another owner on
  its own release schedule, so it is declared as an agreement with the pinned
  dependency declaration as its producer side and the current parsed-feature
  consumption point as its consumer side. node_modules is untracked, so the
  declaration rather than the vendored dist is the honest locator for the
  version that fixes the API.
- Verification starts with npm ci as its own vector, because des verify builds a
  clean temporary checkout with nothing installed.
- Every negative observation is a command that exits 0 only when the refusal
  happens, and the two absence checks are committed acceptance-owned scripts
  rather than shell one-liners, so a dependency tree that cannot be read reports
  a failure instead of a false green. No expectation names a suite or test
  count, because the suite grows as values land and the observation is the exit
  status.

### Reuse analysis (Shared contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with no jest-cucumber)

| Symbol | Locator | Decision | Reason |
|---|---|---|---|
| Fusion | `src/index.js:97` | EXTEND | Keeps its signature, its callsites-based path resolution and its unconditional registry reset; loses the jest-cucumber require and defineFeature call and gains the configuration merge plus the two ports. |
| stepsDefinition | `src/index.js:14` | REUSE | The module-level registry and its rebind-never-mutate discipline are the settled carrier for the procedural design and the M3 fix; nothing in this change needs a different one. |
| addDefinitionFunction | `src/index.js:16` | REUSE | Keyword-bucketed registration with its RegExp and string branches is unchanged; only the source of the keyword it is matched against changes. |
| throwIfDuplicateMatcher | `src/index.js:40` | REUSE | The duplicate-matcher refusal is already Fusion-owned and is explicitly kept. |
| defineAndChain | `src/index.js:68` | REUSE | The StepChain return and the single-argument chained form are the H2 contract that test-d/index.test-d.ts pins; untouched. |
| registerHooks | `src/index.js:165` | REUSE | The M6 fix, hooks registered once per feature. It moves inside the new describe callback and keeps its body. |
| findMatchingStep | `src/index.js:235` | EXTEND | Extracted into src/step-matching.js by the prefactoring move, then simplified: the isOutline parameter and its heuristic branch disappear once step text is concrete, while the ambiguous-step refusal stays. |
| isFunctionForScenario | `src/index.js:267` | EXTEND | Collapses to the ordinary regex-or-string match once the outline branch at src/index.js:273-278 has nothing left to do. |
| isPotentialStepFunctionForScenario | `src/index.js:300` | REPLACE | Deleted. It exists only to guess whether a regex definition could own a step whose text still holds angle-bracket variables, and pickles remove the question. It is also where L2 and L4 lived. |
| maskEscapedParens | `src/index.js:288` | REPLACE | Deleted with the heuristic it serves; nothing else calls it. |
| asScenarioText | `src/index.js:293` | REPLACE | Deleted with the heuristic it serves; nothing else calls it. |
| holdsCapturingGroup | `src/index.js:414` | REPLACE | Deleted with the heuristic it serves; nothing else calls it. |
| evaluateStepFuncEndVsScenarioEnd | `src/index.js:417` | REPLACE | Deleted with the heuristic it serves; nothing else calls it. |
| injectVariable | `src/index.js:439` | EXTEND | Becomes the single capture path for plain scenarios and outline rows alike, keeping the presence-not-type argument forwarding and dropping the two arity-0 pass-through branches that existed only for the jest-cucumber done-callback heuristic. |
| matchJestTestSuiteWithCucumberFeature | `src/index.js:170` | REPLACE | Its shape follows the jest-cucumber split of a parsed feature into scenarios and scenarioOutlines. Pickles are one flat list, so src/test-registration.js replaces it with a single loop. |
| matchJestTestWithCucumberScenario | `src/index.js:189` | REPLACE | Built around the verb object jest-cucumber passes into a scenario callback. Fusion now binds and invokes the steps itself, so that callback shape disappears. |
| parseStepArgument | `node_modules/jest-cucumber/dist/src/parsed-feature-loading.js:57` | REPLACE | The real current owner of the data-table-to-row-objects and docstring-to-string transform. Reimplemented in src/step-argument.js against the pickle shape. The locator is the vendored dist this change removes, which is why the responsibility has to move rather than be reused. |
| defineScenario | `node_modules/jest-cucumber/dist/src/feature-definition-creation.js:113` | REPLACE | The real current owner of sequential step execution and the byte-identical failing-step decoration. Reimplemented in src/test-registration.js as an async test body. Fusion contributes no sequencing at all today, so this is the responsibility most easily missed. |
| getJestCucumberConfiguration | `node_modules/jest-cucumber/dist/src/configuration.js:26` | REPLACE | The real current owner of the defaults, the global object and the errors true normalisation. Reimplemented in src/configuration.js with the same merge order, exposed through setFusionConfiguration. |
| applyTagFilters | `node_modules/jest-cucumber/dist/src/tag-filtering.js:57` | REPLACE | The real current owner of tag filtering. It hand-rolls an expression engine rather than using @cucumber/tag-expressions, so src/tag-filter.js uses the real parser and lowercases both sides to keep the present case-insensitivity. |
| generateStepCode | `node_modules/jest-cucumber/dist/src/code-generation/step-generation.js:74` | REPLACE | The real current owner of starter-code generation, emitting the jest-cucumber idiom. src/code-suggestion.js reuses its argument-detection regex and parameter naming but emits the Fusion verb form. |
| compile | `package.json:25` | REUSE | The Gherkin pickle compiler, reused as-is for outline expansion, Background and Rule collapse, substitution and i18n. The locator is the dependency pin that fixes the API, because the installed dist layout differs between the 28 line present now and the 39.1.0 line being pinned. |
| IdGenerator.incrementing | `package.json:25` | REUSE | Replaces the jest-cucumber use of uuid v4 as the AstBuilder id source, which is one of the two uuid entry points. A local counter is an equally valid carrier; either removes the dependency. |
| callsites | `src/index.js:100` | REUSE | The caller-resolution port and the M4 robustness fix are unchanged, and they are why loadRelativePath is already a no-op: Fusion always resolves relative to the first frame outside the package and passes an absolute path. |

### Prefactoring (Shared contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with no jest-cucumber)

Existing oracle:
`test/specs/features/step-definitions/scenario-outlines.steps.js`

Move: Extract the step-matching and capture-injection functions from
src/index.js into a new src/step-matching.js, required back by src/index.js,
with no behaviour change and jest-cucumber still wired as the engine. The
functions moved are findMatchingStep (src/index.js:235), isFunctionForScenario
(src/index.js:267) and injectVariable (src/index.js:439) together with the
heuristic helpers they call (src/index.js:284-437). No signature, no condition
and no message changes in the move; the heuristic is deleted later, by the value
that lands the pickle path.

Preserved observation: The 2.0.0 outline behaviour is unchanged across the move:
every outline step in test/specs/features/scenario-outlines.feature still binds,
each Examples row still receives its own captures, and
test/specs/features/step-definitions/scenario-outlines.steps.js exits 0 with the
same describe title and the same ordered list of generated test names, repeats
kept in place, before the move and on the after-move-before-behaviour state.

Preservation uses the same existing test and support content before and after
the move, before behavior changes.

Preservation verification command:

```sh
npm ci
```

Preservation verification command:

```sh
npx jest test/specs/features/step-definitions/scenario-outlines.steps.js --coverage=false
```

### Agreement analysis (Shared contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with no jest-cucumber)

| Contract | Role | Locator | Decision | Reason |
|---|---|---|---|---|
| Fusion public options object | producer | `src/index.js:97` | MIGRATED | The options object keeps its shape but is now interpreted by src/configuration.js instead of being forwarded to the jest-cucumber loadFeature. runner is removed, loadRelativePath becomes an explicit no-op, and errors false changes from throwing to a visible skipped test. |
| Fusion public options object | consumer | `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js:64` | MIGRATED | Passes errors false and today asserts that Fusion throws on the unmatched step. Under the ruled semantics the scenario becomes a visible skipped test, so this consumer expectation moves with the contract. |
| Fusion public options object | consumer | `test/specs/features/step-definitions/m3-singleton-reset.steps.js:265` | MIGRATED | Case F asserts that a Fusion call throwing on an unmatched step under errors false still leaves a clean registry. The registry contract holds, but the throw it relies on becomes a skip, so the case needs a different trigger for the same invariant. |
| Fusion public options object | consumer | `test/specs/features/step-definitions/l2-outline-edge-cases.steps.js:139` | MIGRATED | Drives Fusion with options over a staged fake feature to observe outline binding. It moves to a real feature file, because the heuristic it was written to pin is deleted. |
| Fusion public options object | consumer | `test/specs/features/step-definitions/l4-escaped-parens-outline.steps.js:121` | MIGRATED | The same shape as l2, options plus a staged fake feature. It moves to a real feature file for the same reason. |
| public TypeScript surface of the package | producer | `src/index.d.ts:34` | MIGRATED | The options type is derived from the jest-cucumber loadFeature today (src/index.d.ts:7 and 34). Both lines go: the options interface is declared locally, runner is dropped and setFusionConfiguration is added. |
| public TypeScript surface of the package | consumer | `test-d/index.test-d.ts:2` | UNCHANGED_COMPATIBLE | It asserts only the step verbs and the StepChain return type, none of which change. It must keep compiling, which is why npm run test-d is a verification vector. |
| internal feature-loading and test-registration seam | producer | `src/index.js:114` | MIGRATED | The require of jest-cucumber together with its loadFeature and defineFeature pair is the seam eight test files mock. It is replaced by src/feature-source.js and src/test-registration.js, which are internal module paths and not a reinstated runner option. |
| internal feature-loading and test-registration seam | consumer | `test/specs/features/step-definitions/m1-before-hooks-clobber.steps.js:24` | MIGRATED | Mocks the seam to capture the scenario callback and spies on beforeEach. Moves to mocking src/test-registration.js, its real observation point. |
| internal feature-loading and test-registration seam | consumer | `test/specs/features/step-definitions/hook-error.steps.js:20` | MIGRATED | The same observation as m1, that a throwing Before hook is wired into beforeEach rather than swallowed. Moves to mocking src/test-registration.js. |
| internal feature-loading and test-registration seam | consumer | `test/specs/features/step-definitions/m3-singleton-reset.steps.js:57` | MIGRATED | Models the synchronous collection of the seam faithfully, which is what makes reset-after-load observable. Moves to mocking both src/feature-source.js and src/test-registration.js, keeping the synchronous fidelity the case depends on. |
| internal feature-loading and test-registration seam | consumer | `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js:31` | MIGRATED | Fakes the seam so that the handling of an unmatched step by the wrapper itself is isolated. Moves to mocking both seams. |
| internal feature-loading and test-registration seam | consumer | `test/specs/features/step-definitions/ambiguous-step-shadowing.steps.js:31` | MIGRATED | Substitutes only the external collaborator so that the real ambiguity refusal is driven. Moves to mocking both seams; the refusal itself is unchanged. |
| internal feature-loading and test-registration seam | consumer | `test/specs/features/step-definitions/m4-callsite-resolution.steps.js:34` | MIGRATED | Observes the absolute feature path the wrapper resolved. Moves to mocking src/feature-source.js and keeps its separate callsites mock unchanged. |
| internal feature-loading and test-registration seam | consumer | `test/specs/features/step-definitions/l2-outline-edge-cases.steps.js:92` | MIGRATED | Needs a fake only because Fusion binds against template text and defers capture. With pickles it stops needing one and becomes a real feature file plus an assertion on the arguments the step received, which is a stronger oracle. |
| internal feature-loading and test-registration seam | consumer | `test/specs/features/step-definitions/l4-escaped-parens-outline.steps.js:69` | MIGRATED | The same as l2, and the escaped-paren case it pins becomes an ordinary concrete-text match once pickles substitute the row value. |
| Gherkin pickle compilation API and pickle shape | producer | `package.json:25` | MIGRATED | The dependency declaration is where this repository owns the Gherkin version and therefore the pickle API and pickle shape Fusion consumes. It migrates from @cucumber/gherkin 28 reached transitively through jest-cucumber to @cucumber/gherkin 39.1.0 with @cucumber/messages 32.3.1 declared directly, the last CommonJS-loadable line. node_modules is untracked, so the declaration rather than the vendored dist is the honest locator for the version that fixes the API. |
| Gherkin pickle compilation API and pickle shape | consumer | `src/index.js:115` | MIGRATED | This is where Fusion consumes a parsed feature today, through the jest-cucumber loadFeature rather than from the compiler directly, so it is the consumption point that exists in the tree now. It migrates into src/feature-source.js, which parses and compiles pickles itself, shapes the step arguments and reads the Gherkin keyword back through astNodeIds. |

### Impact closure (Shared contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with no jest-cucumber)

- manifest: `package.json`; CHANGED: jest-cucumber removed from dependencies and
  the three cucumber packages pinned exactly. jest.testMatch is unchanged, so
  the new oracles under test/specs/arch, test/specs/contract and
  test/specs/features are discovered without a discovery change.
- lock: `package-lock.json`; CHANGED: Regenerated so that npm ci in a clean
  checkout installs the pinned line and no uuid path remains.
- public_interface: `src/index.js`; CHANGED: Loses the jest-cucumber require and
  the outline heuristic and gains setFusionConfiguration and the two port calls;
  the verbs, registry, duplicate guard and reset keep their behaviour.
- public_interface: `src/index.d.ts`; CHANGED: The jest-cucumber type import and
  the options type derived from it are replaced by a locally declared options
  interface, runner is removed, setFusionConfiguration is added and
  loadRelativePath is documented as a no-op.
- runtime: `src/configuration.js`; CHANGED: New module owning defaults, the
  global object, the merge order and the errors true normalisation.
- runtime: `src/feature-source.js`; CHANGED: New driven port owning path
  resolution, file reading, parsing, pickle compilation, the keyword index,
  argument shaping and tag filtering.
- runtime: `src/keywords.js`; CHANGED: New module mapping an AST step keyword
  through the Gherkin dialects onto exactly one of the five registry buckets, or
  refusing.
- runtime: `src/step-argument.js`; CHANGED: New module turning a pickle step
  argument into the row-object array or string a consumer step receives,
  preserving the empty string and the empty array.
- runtime: `src/step-matching.js`; CHANGED: New module receiving the extracted
  matching and capture code, then losing the outline heuristic.
- runtime: `src/test-registration.js`; CHANGED: New driven port owning describe
  and test registration, hook wiring, sequential awaited execution and the
  byte-identical failing-step decoration.
- runtime: `src/tag-filter.js`; CHANGED: New module wrapping
  @cucumber/tag-expressions with lowercasing on both sides to keep
  case-insensitive matching.
- runtime: `src/code-suggestion.js`; CHANGED: New module emitting starter code
  in the Fusion verb idiom for an unmatched step.
- consumer: `src/index.js:115`; MIGRATED: The parsed-feature consumption point
  for the Gherkin pickle contract. It moves out of src/index.js into
  src/feature-source.js, which parses and compiles pickles directly against the
  pinned version.
- consumer:
  `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js:64`;
  MIGRATED: Its errors false expectation moves from a throw to a visible skipped
  test.
- consumer:
  `test/specs/features/step-definitions/m3-singleton-reset.steps.js:265`;
  MIGRATED: Case F keeps the clean-slate invariant but needs a trigger that
  still throws, since an unmatched step under errors false now skips.
- consumer:
  `test/specs/features/step-definitions/l2-outline-edge-cases.steps.js:139`;
  MIGRATED: Moves from a staged fake feature to a real feature file driven
  through the public surface.
- consumer:
  `test/specs/features/step-definitions/l4-escaped-parens-outline.steps.js:121`;
  MIGRATED: Moves from a staged fake feature to a real feature file driven
  through the public surface.
- test:
  `test/specs/features/step-definitions/m1-before-hooks-clobber.steps.js:24`;
  MIGRATED: Mocks src/test-registration.js instead of jest-cucumber; the
  hook-order observation is unchanged.
- test: `test/specs/features/step-definitions/hook-error.steps.js:20`; MIGRATED:
  Mocks src/test-registration.js instead of jest-cucumber; the throwing-hook
  observation is unchanged.
- test: `test/specs/features/step-definitions/m3-singleton-reset.steps.js:57`;
  MIGRATED: Mocks both new seams, keeping the synchronous collection fidelity
  that makes reset-after-load observable.
- test:
  `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js:31`;
  MIGRATED: Mocks both new seams to isolate the handling of an unmatched step.
- test:
  `test/specs/features/step-definitions/ambiguous-step-shadowing.steps.js:31`;
  MIGRATED: Mocks both new seams; the ambiguity refusal it drives is unchanged.
- test:
  `test/specs/features/step-definitions/m4-callsite-resolution.steps.js:34`;
  MIGRATED: Mocks src/feature-source.js to observe the resolved absolute path;
  its callsites mock is untouched.
- test:
  `test/specs/features/step-definitions/l2-outline-edge-cases.steps.js:92`;
  MIGRATED: Stops mocking anything and becomes a real feature file with an
  assertion on the arguments the step received.
- test:
  `test/specs/features/step-definitions/l4-escaped-parens-outline.steps.js:69`;
  MIGRATED: Stops mocking anything; the escaped-paren case becomes an ordinary
  concrete-text match.
- test: `test-d/index.test-d.ts:2`; UNCHANGED_COMPATIBLE: Asserts only the step
  verbs and the StepChain return type, none of which change; npm run test-d
  keeps it honest.

### Architectural tests (Shared contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with no jest-cucumber)

The following checks falsify the declared obligations using the linked native
verification command.

Obligation: No file anywhere under src/ requires jest-cucumber, now or as files
are added. The check enumerates the src/ tree itself rather than a fixed list,
so a module added by a later value is covered.

Test locator: `test/specs/arch/dependency-direction.steps.js`

Verification command index: `5`

Obligation: Only src/feature-source.js requires @cucumber/gherkin,
@cucumber/messages, node:fs or callsites, and only src/test-registration.js
references a Jest global such as describe, test, beforeEach or afterEach. The
pure core modules reference none of them, so the dependency direction is inward
and the external parser stays swappable behind one port.

Test locator: `test/specs/arch/dependency-direction.steps.js`

Verification command index: `5`

Obligation: src/index.js exports exactly Given, When, Then, And, But, Before,
After, Fusion and setFusionConfiguration and nothing else, so the dropped runner
option is not reintroduced as an export and the internal seams stay internal.

Test locator: `test/specs/arch/dependency-direction.steps.js`

Verification command index: `5`

### Contract tests (Shared contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with no jest-cucumber)

The following checks falsify the declared obligations using the linked native
verification command.

Obligation: The pickle facts Fusion depends on hold for the pinned Gherkin
version, observed by running the real installed compiler through the real
consumer module rather than a fixture: one pickle per Examples row, the outline
title and step text and data-table cells substituted, Background and Rule
backgrounds collapsed in, feature and Examples tags unioned onto the pickle, an
empty docstring preserved as the empty string, and astNodeIds present on every
pickle step so the Gherkin keyword can be recovered.

Test locator: `test/specs/contract/gherkin-pickles.steps.js`

Verification command index: `6`

Contract: Gherkin pickle compilation API and pickle shape

Producer: `package.json:25`; consumer: `src/index.js:115`

Observation: Compiling a feature that holds a Background, a Rule with its own
Background, two same-titled scenarios and a Scenario Outline whose step carries
an empty docstring and a data table yields pickles whose names and step texts
are the substituted ones, whose step argument for the docstring step is the
empty string and not undefined, and each of whose steps carries at least one
astNodeId resolving to an AST step with a Gherkin keyword.

### Architecture decision record (Shared contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with no jest-cucumber)

Context: jest-cucumber 4.5.0 is dormant, last released on 2024-07-25, and is the
only route by which consumers of this package reach the runtime-scope uuid
advisory GHSA-w5hq-g745-h8pq. It cannot be fixed upstream. It is also not a thin
parser for Fusion: it owns feature loading, outline expansion, describe and test
registration, sequential step execution, failure decoration, tag filtering, name
templates, validation and starter-code generation. Removing it therefore means
Fusion takes over the whole test lifecycle, and a measured probe showed that the
current cucumber majors publish ESM only, which Jest 30 on Node 22 cannot
require.

Decision: Build Fusion directly on jest plus @cucumber/gherkin, pinned to the
last CommonJS-loadable line of @cucumber/gherkin 39.1.0, @cucumber/messages
32.3.1 and @cucumber/tag-expressions 9.1.0. Use Gherkin pickles for outline
expansion, Background and Rule collapse, substitution and i18n, and recover the
Gherkin keyword that pickles discard through astNodeIds into the parsed AST.
Decompose src/ into a public surface, a pure core and two driven ports,
src/feature-source.js and src/test-registration.js, which also become the
internal test seam that replaces mocking jest-cucumber. Delete the outline
heuristic, keep the failing-step and missing-file texts byte-identical, and stay
CommonJS and procedural.

Status: accepted

Alternatives considered:

- Take the current cucumber majors, @cucumber/gherkin 42 and @cucumber/messages
  34, and their smaller dependency trees. Rejected on measurement: both are
  ESM-only and Jest 30 on Node 22 answers that it must use import to load an ES
  module, so every consumer below Node 24.9 would break.
- Keep the ESM majors and ask consumers to add transformIgnorePatterns for the
  cucumber scope. Rejected: it pushes required Jest configuration onto every
  consumer of a library whose selling point is that it needs none.
- Add a bundling step that inlines Gherkin into a CommonJS artifact. Rejected:
  the package has no build step today, and it would mean publishing someone else
  code inside ours.
- Port the jest-cucumber AST walk instead of using pickles. Rejected: it
  re-inherits every upstream defect, including L5, whose root cause is a
  truthiness test inside that walk.
- Keep jest-cucumber and address the advisory another way. Rejected: there is no
  other way, since upstream is dormant and the advisory arrives through its own
  dependency tree.
- Write a minimal Gherkin parser in this package. Rejected: it would cost far
  more than the change and would lose the i18n, Rule and pickle semantics that
  the real parser already gets right.

Consequences of this decision:

- Consumers get an install with no dependency path to jest-cucumber and none to
  uuid, which is the outcome the Request exists for.
- Fusion now owns sequential step execution and failure decoration,
  responsibilities it contributes nothing to today, so a defect there is newly
  ours.
- The pin sits behind cucumber majors that have already moved on, and moving
  forward later needs Node 24.9 or above, or an ESM or dual publish, recorded as
  out of scope.
- @cucumber/messages 32.3.1 still brings reflect-metadata and class-transformer,
  so the production tree shrinks less than the ESM line would have given. uuid
  still goes, which is the point.
- Deleting the outline heuristic removes the most defect-prone code in the
  package and the home of L2 and L4, at the risk that a definition which binds
  only through it stops binding. The whole repository suite run is the
  falsifier.
- An asterisk step changes from an unhandled TypeError to a named refusal,
  because the keyword is resolved to a closed set before it reaches the
  registry.
- Three consumer-visible behaviours change and need release notes: the deleted
  heuristic, the dropped pending sniff, and scenarioNameTemplate now applying to
  outline rows. The global configuration import also moves to this package.
- The eight test files that mock jest-cucumber migrate to the new internal
  seams, and two of them stop needing a fake at all, which strengthens them.
  Their own test names change deliberately and are outside the generated-name
  comparison.

### Boundaries (Shared contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with no jest-cucumber)

- Driving port: The CommonJS module surface of src/index.js as required by a
  consumer .steps.js file collected by their own Jest: Given, When, Then, And,
  But, Before, After, Fusion and setFusionConfiguration, all called
  synchronously at module load, with the Jest run itself as the observation
  surface for everything Fusion registers.
- Driven port: Feature file bytes read through node:fs by src/feature-source.js.
- Driven port: Gherkin parsing and pickle compilation through @cucumber/gherkin
  39.1.0 and @cucumber/messages 32.3.1, reached only from src/feature-source.js.
- Driven port: Tag expression parsing through @cucumber/tag-expressions 9.1.0,
  reached only from src/tag-filter.js.
- Driven port: The Jest globals describe, test, test.skip, beforeEach and
  afterEach, reached only from src/test-registration.js.
- Driven port: Caller stack introspection through callsites, reached only from
  src/feature-source.js.
- Dependency direction: Inward. A consumer .steps.js depends on src/index.js;
  src/index.js depends on the pure core of configuration, keywords,
  step-argument, step-matching, tag-filter and code-suggestion, and on the two
  driven ports; the ports depend on the core and on the external packages.
  Nothing in the core depends on a port, on node:fs, on @cucumber/gherkin or on
  a Jest global, and nothing in src/ depends on jest-cucumber. The two ports do
  not depend on each other: src/feature-source.js produces a LoadedFeature value
  that src/index.js hands to src/test-registration.js.
- Failure: Condition: The resolved feature file does not exist. | Outcome:
  Refusal | Observation: Fusion throws at collection with the message Feature
  file not found followed by the absolute path in parentheses, byte-identical to
  today, plus the resolved base directory as a HOW, and the registry is left
  clean.
- Failure: Condition: The feature file is not valid Gherkin. | Outcome: Refusal
  | Observation: Fusion throws at collection with the message Error parsing
  feature Gherkin followed by the parser message, the wording preserved from
  today.
- Failure: Condition: A feature step matches no registered definition in its
  keyword bucket and stepsMustMatchFeatureFile is on. | Outcome: Refusal |
  Observation: One Fusion-owned unmatched-step error carrying starter code in
  the Fusion verb idiom, containing the phrase step definition so the existing
  undefined-step guard still recognises it.
- Failure: Condition: A feature step matches no registered definition and
  stepsMustMatchFeatureFile is off, either through errors false or through the
  explicit key. | Outcome: Refusal | Observation: The scenario is registered
  through test.skip, so Jest reports it as a skipped test under its own
  unannotated name and never as a passing one. Validation can be switched off
  but never into silence.
- Failure: Condition: Two registered definitions in the same keyword bucket
  match one step text. | Outcome: Refusal | Observation: The existing ambiguous
  step definition error, naming the step text, the count and every competing
  matcher.
- Failure: Condition: The same matcher is registered twice for one keyword. |
  Outcome: Refusal | Observation: The existing duplicate step definition error,
  naming the matcher and the keyword.
- Failure: Condition: Two scenarios in one feature file carry the same title and
  scenariosMustMatchFeatureFile is on. | Outcome: Refusal | Observation:
  Collection of the whole step definition file fails, naming the duplicated
  scenario title, so no test in that file runs. With the key off the same file
  is accepted.
- Failure: Condition: A step Gherkin keyword resolves to no registry bucket,
  which is reachable through the asterisk step that every Gherkin dialect
  allows. | Outcome: Refusal | Observation: A named refusal stating the
  unsupported keyword and the five keywords Fusion supports, instead of the bare
  TypeError raised today by Object.keys on an undefined bucket.
- Failure: Condition: A step function throws or its returned promise rejects. |
  Outcome: Refusal | Observation: The test fails with the byte-identical
  decoration of a Failing step line carrying the step text, a Step arguments
  line carrying the JSON of the arguments and an Error line carrying the
  original message, and no later step in that scenario runs.
- Failure: Condition: The tagFilter expression cannot be parsed. | Outcome:
  Refusal | Observation: Collection fails naming the offending expression,
  surfaced from @cucumber/tag-expressions rather than from a hand-rolled
  function constructor.
- Failure: Condition: The consumer Jest or Node cannot require the pinned
  CommonJS cucumber packages, for example after someone bumps them to an
  ESM-only major. | Outcome: Indeterminate | Observation: The require fails at
  collection with the loader own message about having to use import to load an
  ES module, before Fusion can read anything, so Fusion makes no claim about the
  feature at all. This is the named residue of the CommonJS pin and the reason
  the versions are exact.

### Acceptance supports (Shared contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with no jest-cucumber)

- `test/specs/features/shared-contract.feature`
- `test/specs/baseline/test-names-2.0.0.txt`
- `test/specs/baseline/assert-test-names.js`
- `test/specs/baseline/assert-no-advisory-dependency.js`

### Public oracle (Shared contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with no jest-cucumber)

Observation: A consumer .steps.js file required by Jest 30 on Node 22 gets the
whole Fusion lifecycle from this package alone: the production dependency tree
has no path to jest-cucumber and none to uuid, the repository suite exits 0,
every describe title and ordered list of test names that Fusion generates from
the repository feature files is byte-identical to the 2.0.0 run with repeats
kept in place, a failing step reports the 2.0.0 text, and a scenario outline row
whose step carries an empty docstring receives the empty string rather than
losing the argument.

Stimulus: From a clean checkout: npm ci, then npx jest on
test/specs/features/step-definitions/shared-contract.steps.js, which is an
ordinary consumer step definition file that requires src/index.js, registers
Given, And and But definitions and calls Fusion on
test/specs/features/shared-contract.feature, a feature holding a Background, a
Rule with its own Background, a data table and a Scenario Outline whose step
carries an empty docstring. Then npx jest over the whole repository, then node
test/specs/baseline/assert-no-advisory-dependency.js, then node
test/specs/baseline/assert-test-names.js, then the architectural and contract
vectors, then npm run test-d.

Expected: jest exits 0 for the oracle file, reporting its scenarios under a
describe named for the feature title, one test per Examples row carrying the
substituted title, with the outline step receiving the row value followed by the
empty string, the data-table step receiving an array of header-keyed row
objects, And and But definitions bound only to And and But steps including in
the Dutch dialect, Before and After running exactly once per test, and a
deliberately failing step reporting the Failing step, Step arguments and Error
lines. The whole repository suite exits 0. assert-no-advisory-dependency.js
prints that the production tree holds no jest-cucumber and no uuid and exits 0,
and exits non-zero if it cannot read the tree at all rather than reporting
success. assert-test-names.js prints that every suite recorded in
test/specs/baseline/test-names-2.0.0.txt is still present and still generates an
identical ordered list of describe and test names, repeats kept in place, and
exits 0; test files that do not call Fusion on a feature file and suites added
by a later value have no baseline entry and are not compared. The architectural
vector exits 0, the contract vector exits 0 and npm run test-d exits 0.

Falsifier: Reinstating a require of jest-cucumber anywhere under src/, or
reaching for @cucumber/gherkin, node:fs or a Jest global from a core module,
makes the architectural vector exit non-zero; leaving jest-cucumber or any uuid
in the production tree makes assert-no-advisory-dependency.js exit non-zero;
renaming or reordering any name Fusion generates from a feature file, dropping
the substituted outline title, collapsing the three identically named Selling
all of one tests into one, or deleting a baseline suite or making it stop
calling Fusion, makes assert-test-names.js exit non-zero against
test/specs/baseline/test-names-2.0.0.txt, while rewriting an internal regression
test file that calls no Fusion feature does not, because it carries no baseline
entry; delivering the empty docstring as undefined, delivering a data table as
raw pickle cells, binding an And definition to a Given step, running a hook more
than once per test, or changing one byte of the failing-step decoration makes
the oracle file fail; and bumping the Gherkin pin to an ESM-only major makes the
contract vector fail at require time.

### Oracle and verification (Shared contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with no jest-cucumber)

Oracle target locator:
`test/specs/features/step-definitions/shared-contract.steps.js`
Oracle verification command index: `1`

Verification command:

```sh
npm ci
```

Verification command:

```sh
npx jest test/specs/features/step-definitions/shared-contract.steps.js --coverage=false
```

Verification command:

```sh
npx jest --coverage=false
```

Verification command:

```sh
node test/specs/baseline/assert-no-advisory-dependency.js
```

Verification command:

```sh
node test/specs/baseline/assert-test-names.js
```

Verification command:

```sh
npx jest test/specs/arch/dependency-direction.steps.js --coverage=false
```

Verification command:

```sh
npx jest test/specs/contract/gherkin-pickles.steps.js --coverage=false
```

Verification command:

```sh
npm run test-d
```

## Value 1: Fusion runs the existing feature corpus on pinned Gherkin pickles, with jest-cucumber removed

### Purpose (Value 1: Fusion runs the existing feature corpus on pinned Gherkin pickles, with jest-cucumber removed)

Land the whole shared lifecycle in one step and remove jest-cucumber: parse the
feature and compile pickles directly, recover the Gherkin keyword through
astNodeIds, shape step arguments, register describe and test and run steps
sequentially over the Jest globals, merge per-call options locally, delete the
outline heuristic, drop the pending sniff, and keep the failing-step and
missing-file texts byte-identical, so a clean consumer project installing the
packed tarball has no dependency path to jest-cucumber or uuid and the existing
feature corpus still generates the 2.0.0 names.

### Constraints (Value 1: Fusion runs the existing feature corpus on pinned Gherkin pickles, with jest-cucumber removed)

- This value carries no V2 to V5 behaviour. An unmatched step keeps failing
  exactly as loudly as it does today, so
  test/specs/features/step-definitions/undefined-step.steps.js stays green on
  its present assertion; the Fusion-idiom starter code and the skip semantics
  belong to value 2, tagFilter to value 3, scenarioNameTemplate to value 4 and
  setFusionConfiguration to value 5.
- src/tag-filter.js and src/code-suggestion.js are not created here.
  src/configuration.js lands with the defaults and the per-call merge and the
  errors true normalisation only; the global object and its setter arrive at
  value 5.
- Dependencies are pinned exactly to @cucumber/gherkin 39.1.0,
  @cucumber/messages 32.3.1 and jest-cucumber is removed.
  @cucumber/tag-expressions is not added here because nothing consumes it until
  value 3.
- The package stays CommonJS with no build step, and Fusion still completes
  synchronously at module load so it can register describe and test during Jest
  collection.
- For every suite in the 2.0.0 baseline that calls Fusion on a feature file, the
  describe title and the ordered list of generated test names stay
  byte-identical, repeats kept in their positions. Test files that do not call
  Fusion on a feature file, and suites added by a later value, are outside that
  comparison.
- The failing-step decoration stays byte-identical: a Failing step line carrying
  the step text in double quotes, a Step arguments line carrying the JSON of the
  arguments, then an Error line carrying the original message.
- A missing feature file keeps the message Feature file not found followed by
  the absolute path in parentheses, with the resolved base directory appended as
  a HOW.
- Before and After hooks are still registered once per feature inside that
  feature describe block, and Fusion still leaves the registry empty on normal
  return and on throw alike.
- The whole repository suite exits 0 at the end of this value. No expectation
  names a suite or test count.
- Every negative observation is a command that exits 0 only when the refusal
  happens, and reports a failure rather than success when it cannot make the
  observation at all.

### Targets (Value 1: Fusion runs the existing feature corpus on pinned Gherkin pickles, with jest-cucumber removed)

| Path | Decision | Reason |
|---|---|---|
| `package.json` | EXTEND | Remove jest-cucumber from dependencies (package.json:25) and add the exact pins @cucumber/gherkin 39.1.0 and @cucumber/messages 32.3.1. jest.testMatch (package.json:74) already selects every .steps.js file, so the new arch, contract and shared-contract oracles are discovered with no discovery change. |
| `package-lock.json` | EXTEND | npm ci in the clean verification checkout resolves from the lock, so the pinned line and the absence of every uuid path must be recorded here or the first vector fails. |
| `src/index.js` | EXTEND | Loses the jest-cucumber require (src/index.js:114), the loadFeature call (src/index.js:115) and the defineFeature call (src/index.js:133), and loses the outline heuristic (src/index.js:284-437) with its helpers. Keeps the registry (src/index.js:14), the verbs, the duplicate-matcher guard, registerHooks and the unconditional reset, and now calls src/feature-source.js then src/test-registration.js. |
| `src/index.d.ts` | EXTEND | The jest-cucumber type import (src/index.d.ts:7) and the options type derived from it (src/index.d.ts:34) die with the dependency, so the options interface is declared locally with runner removed and loadRelativePath kept as a documented no-op. setFusionConfiguration is not added here. |
| `src/configuration.js` | CREATE_NEW | Owns the option defaults, the per-call merge and the normalisation of errors true into the three-key object, replacing what the jest-cucumber configuration module does at configuration.js:26-36. The global object and its public setter are deliberately left to value 5. |
| `src/feature-source.js` | CREATE_NEW | Driven port: resolve the caller directory through callsites, read the feature bytes, parse with @cucumber/gherkin, compile pickles, build the astNodeId to keyword index and shape the step arguments, returning one internal LoadedFeature value. Only this module requires node:fs, @cucumber/gherkin or callsites, and it is half of the internal test seam. |
| `src/keywords.js` | CREATE_NEW | Pickles discard the Gherkin keyword, since PickleStep.type carries only Context, Action or Outcome. This module resolves an AST step keyword through the Gherkin dialects onto exactly one of given, when, then, and, but, or refuses, which is what keeps keyword-scoped shadowing and the Dutch dialect in test/specs/features/language.feature working. |
| `src/step-argument.js` | CREATE_NEW | Turns a pickle dataTable into the array of header-keyed row objects and a pickle docString into the plain string a consumer step function receives, forwarding on presence so the empty string and the empty array survive. This is where L5 closes. |
| `src/step-matching.js` | CREATE_NEW | Created by the prefactoring move below, which extracts findMatchingStep, isFunctionForScenario and injectVariable out of src/index.js with no behaviour change, then loses the heuristic once pickle step text is concrete. Owns lookup within one keyword bucket, the ambiguous-step refusal and capture extraction. |
| `src/test-registration.js` | CREATE_NEW | Driven port over the Jest globals, taking over what jest-cucumber does at feature-definition-creation.js:119-159 and 222-238: one describe per feature title, no describe for a feature with no scenarios, hooks once inside that describe, one test per pickle, steps awaited in order, and the byte-identical failing-step decoration. |
| `test/specs/features/step-definitions/m1-before-hooks-clobber.steps.js` | EXTEND | Its jest.mock of jest-cucumber (line 24) stops resolving the moment the dependency is removed. Migrates to mocking src/test-registration.js, preserving the recorded observation that both Before hooks run in registration order. |
| `test/specs/features/step-definitions/hook-error.steps.js` | EXTEND | Its jest.mock of jest-cucumber (line 20) stops resolving. Migrates to mocking src/test-registration.js, preserving the observation that a throwing Before hook is wired into beforeEach rather than swallowed. |
| `test/specs/features/step-definitions/m3-singleton-reset.steps.js` | EXTEND | Its jest.mock of jest-cucumber (line 57) stops resolving. Migrates to mocking both src/feature-source.js and src/test-registration.js, keeping the synchronous collection fidelity that makes reset-after-load observable, and keeping cases A to F including the errors false throw that value 1 preserves. |
| `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js` | EXTEND | Its jest.mock of jest-cucumber (line 31) stops resolving. Migrates to mocking both seams. Its assertion is unchanged at this value because value 1 keeps today's errors false throw; value 2 is what turns it into a skip. |
| `test/specs/features/step-definitions/ambiguous-step-shadowing.steps.js` | EXTEND | Its jest.mock of jest-cucumber (line 31) stops resolving. Migrates to mocking both seams; the ambiguity refusal it drives is Fusion-owned and unchanged. |
| `test/specs/features/step-definitions/m4-callsite-resolution.steps.js` | EXTEND | Its jest.mock of jest-cucumber (line 34) stops resolving. Migrates to mocking src/feature-source.js to observe the resolved absolute path, and keeps its separate callsites mock untouched because callsites stays. |
| `test/specs/features/step-definitions/l2-outline-edge-cases.steps.js` | EXTEND | Its jest.mock of jest-cucumber (line 92) stops resolving, and the heuristic it was written to pin is deleted. Migrates to driving the real public surface over the new test/specs/features/l2-outline-edge-cases.feature, with an assertion on the arguments the step received, so it needs no fake at all. Its present Fusion call at line 139 is rewritten to load that file by the relative path ../l2-outline-edge-cases.feature. |
| `test/specs/features/step-definitions/l4-escaped-parens-outline.steps.js` | EXTEND | Its jest.mock of jest-cucumber (line 69) stops resolving. Migrates the same way as l2, driving the real public surface over the new test/specs/features/l4-escaped-parens-outline.feature, with its present Fusion call at line 121 rewritten to load that file by the relative path ../l4-escaped-parens-outline.feature. The escaped-paren case becomes an ordinary concrete-text match once pickles substitute the row value. |
| `test/specs/features/l2-outline-edge-cases.feature` | CREATE_NEW | The real Gherkin feature that l2-outline-edge-cases.steps.js drives once its fake is removed, carrying the outline edge cases that file currently stages as a fabricated parsed feature: an Examples row whose substituted value must reach a regex definition's capture group, including the bounded-quantifier and alternation shapes recorded at src/index.js:338-346 and 421-431. Declared as a craft target because the crafter owns the migration of that test file, so it is not an acceptance support. |
| `test/specs/features/l4-escaped-parens-outline.feature` | CREATE_NEW | The real Gherkin feature that l4-escaped-parens-outline.steps.js drives once its fake is removed, carrying the escaped-paren outline case that file currently stages: an outline step whose definition regex holds an escaped parenthesis, which the deleted heuristic handled through maskEscapedParens at src/index.js:288 and which must now bind by ordinary matching on the substituted text. Declared as a craft target for the same reason as the l2 feature. |

### Paradigm (Value 1: Fusion runs the existing feature corpus on pinned Gherkin pickles, with jest-cucumber removed)

procedural

### Decisions (Value 1: Fusion runs the existing feature corpus on pinned Gherkin pickles, with jest-cucumber removed)

- Resolution of who edits the eight files that mock jest-cucumber: the crafter,
  as EXTEND targets, with no file appearing in acceptance_supports. The deciding
  fact is authorability, not preference. Six of them must mock
  src/feature-source.js or src/test-registration.js, and jest.mock of a module
  that does not exist yet fails at collection, so the acceptance designer cannot
  author them before craft. The other two, l2 and l4, could be rewritten against
  real feature files before craft, but they were written for defects already
  fixed in 2.0.0, so the present code passes those cases and a pre-craft rewrite
  would be green before and after and would falsify nothing in this value.
  Keeping one owner for all eight also keeps supports and targets disjoint,
  which avoids both measured traps: no file is recorded as an oracle support and
  then rewritten by craft, and no file is called acceptance-owned without being
  declared.
- The two real feature files those migrations need,
  test/specs/features/l2-outline-edge-cases.feature and
  test/specs/features/l4-escaped-parens-outline.feature, are declared as craft
  targets alongside the test files that drive them, so no untargeted bytes
  appear. They follow the repository layout, features in test/specs/features and
  step definitions in test/specs/features/step-definitions reaching them by a
  relative ../name.feature path, and they are not acceptance supports because
  the crafter owns both halves of each migration.
- The judge stays separate from the judged where it matters, because none of
  this value's falsifiers is crafter-written: the primary oracle, the two
  baseline scripts, the packaged-consumer script and the arch and contract specs
  are all acceptance-owned. The eight migrated files are 2.0.0 regression guards
  whose preservation is checked by the independent implementation review, not by
  the crafter asserting it.
- Resolution of the npm-pack consumer observation: it is a real verification
  vector, carried by the acceptance-owned script
  test/specs/baseline/assert-packaged-consumer.js. The script runs npm pack in
  the repository, creates a unique temporary directory outside the repository
  with mkdtemp, initialises an empty project there, installs the tarball by
  absolute path, writes one minimal .feature and one .steps.js in that project,
  runs the project own jest, then runs npm ls jest-cucumber and npm ls uuid
  there, asserts that neither resolves and that the jest run exits 0, removes
  its own temporary directory, and exits 0 only when every one of those holds.
- That vector needs registry access, but it adds no new capability requirement,
  because vector 0 is npm ci and already needs it. It needs no second framework
  install either: jest is a declared dependency of this package, so installing
  the tarball brings the consumer its own jest. If the script cannot pack,
  cannot install, or cannot read the dependency tree, it prints what failed and
  exits non-zero rather than reporting success, so a host without network yields
  an explicit failure to be adjudicated and never a false green.
- Recorded gap on that observation: it exercises a temporary project rather than
  a registry install of a published 3.0.0, so it cannot catch anything that only
  the real publish introduces, such as a registry-side version or provenance
  problem. It does catch the class that matters here, a packaging or files-field
  defect that keeps a needed source file out of the tarball, and the
  dependency-path claim that the whole Request exists for. No weaker substitute
  is used in its place.
- Resolution of which shared-contract oracle pieces this value owns: all of
  them, because des oracle runs per value and the shared section has no oracle
  step of its own, so anything the shared authority named would otherwise have
  no creator. This value therefore declares
  test/specs/features/step-definitions/shared-contract.steps.js as its primary
  oracle and, as its supports, test/specs/features/shared-contract.feature, the
  three test/specs/baseline files, the new packaged-consumer script, and the
  arch and contract spec files. Later values add their own oracles and extend
  these; they do not re-own them.
- The primary oracle is one ordinary consumer step definition file. It requires
  src/index.js, registers Given, And and But definitions and calls Fusion on
  test/specs/features/shared-contract.feature, a feature holding a Background, a
  Rule with its own Background, a data table, and a Scenario Outline whose step
  carries an empty docstring. Its genuinely red observation today is that empty
  docstring, which jest-cucumber nulls on a truthiness test at
  parsed-feature-loading.js:96-97 before Fusion is ever called, so the step
  receives one argument where two are due. Everything else it observes is
  preservation.
- Gherkin pickles own expansion, so one compile gives one pickle per Examples
  row with the title, the step text and every data-table cell substituted, with
  Background and Rule backgrounds collapsed in. That is what makes the 2.0.0
  names reproducible without any substitution code of our own, including the
  repeated titles of the three Selling all of one tests in
  test/specs/features/scenario-outlines.feature:16-26.
- The Gherkin keyword is recovered per pickle step through PickleStep.astNodeIds
  into the parsed AST and mapped through the dialects, because the pickle
  carries only Context, Action or Outcome. The map is total and deterministic:
  the trimmed AST keyword is resolved against the dialect lists in the fixed
  order given, when, then, and, but, and the first list holding it wins.
- An asterisk step, legal in every Gherkin dialect, raises a named refusal
  stating the unsupported keyword. Today it crashes with a bare TypeError
  because findMatchingStep calls Object.keys on an undefined bucket at
  src/index.js:238. The cure is in the representation rather than a guard:
  src/keywords.js yields one of exactly five buckets or a refusal, so the
  invalid keyword can no longer reach the lookup.
- The outline heuristic at src/index.js:284-437 is deleted here. Pickle step
  text is already concrete, so an outline step binds by ordinary matching and
  capture extraction runs through the existing injectVariable path for outline
  rows as well as plain scenarios. The whole repository suite run is the
  falsifier for risk R4, and test/specs/features/scenario-outlines.feature:35-76
  together with using-dynamic-values.feature:15-34 are its sharpest cases.
- The done-callback heuristic disappears with the dependency and no consumer
  notices, because all three current wrapper shapes report arity 0 at
  src/index.js:456, 467 and 487, so the test at
  feature-definition-creation.js:132 is already always false for a Fusion
  consumer. The rest-parameter workaround and its comment go with it.
- The pending source sniff at feature-definition-creation.js:85-100 is dropped
  and no pending verb is added, so a consumer whose step body merely contains
  the text of a pending call runs instead of being silently skipped. Release
  note required.
- Sequential awaited step execution and the failing-step decoration are newly
  ours. Fusion contributes no sequencing at all today, so
  src/test-registration.js must reduce the bound steps into an awaited chain and
  decorate a throw or rejection byte-identically, and no later step in a failed
  scenario runs.
- Dependency direction is enforced as an architectural law over the tree as it
  exists at this value, not over a fixed module list, so the modules that values
  2 and 3 add are covered when they arrive without editing the law.
- The prefactoring move declared below is the shared preserving move, assigned
  here because value 1 is the value that creates src/step-matching.js. It is
  measured before the move and on the after-move-before-behaviour state, with
  jest-cucumber still wired, so the extraction is proved behaviour-preserving
  before any pickle code exists.
- The Gherkin pickle API and pickle shape is declared as an agreement with
  another owner on its own release schedule, with the dependency declaration as
  the producer side and the current parsed-feature consumption point as the
  consumer side. node_modules is untracked, so the declaration rather than the
  vendored dist is the honest locator for the version that fixes the API.
- The contract specification is a guard rather than a falsifier for this value,
  and that is stated rather than hidden: @cucumber/gherkin 28, which is
  resolvable today through the jest-cucumber tree, already produces every pickle
  fact the design relies on, so the specification is green before and after. It
  goes red if a later pin changes the pickle shape or moves to an ESM-only major
  that cannot be required.

### Reuse analysis (Value 1: Fusion runs the existing feature corpus on pinned Gherkin pickles, with jest-cucumber removed)

| Symbol | Locator | Decision | Reason |
|---|---|---|---|
| Fusion | `src/index.js:97` | EXTEND | Keeps its signature, its callsites-based path resolution and its unconditional registry reset; loses the jest-cucumber require, loadFeature and defineFeature calls and gains the per-call configuration merge plus the two ports. |
| stepsDefinition | `src/index.js:14` | REUSE | The module-level registry and its rebind-never-mutate discipline are the settled carrier for the procedural design and the M3 fix; nothing in this value needs a different one. |
| addDefinitionFunction | `src/index.js:16` | REUSE | Keyword-bucketed registration with its RegExp and string branches is unchanged; only the source of the keyword it is matched against changes. |
| throwIfDuplicateMatcher | `src/index.js:40` | REUSE | The duplicate-matcher refusal is already Fusion-owned and is kept verbatim. |
| defineAndChain | `src/index.js:68` | REUSE | The StepChain return and the single-argument chained form are the H2 contract that test-d/index.test-d.ts pins; untouched, which is why npm run test-d stays a vector. |
| registerHooks | `src/index.js:165` | REUSE | The M6 fix, hooks registered once per feature. It moves inside the new describe callback and keeps its body. |
| findMatchingStep | `src/index.js:235` | EXTEND | Extracted into src/step-matching.js by the prefactoring move, then simplified: the isOutline parameter and its heuristic branch go once step text is concrete, while the ambiguous-step refusal stays. |
| isFunctionForScenario | `src/index.js:267` | EXTEND | Collapses to the ordinary regex-or-string match once the outline branch at src/index.js:273-278 has nothing left to do. |
| isPotentialStepFunctionForScenario | `src/index.js:300` | REPLACE | Deleted. It exists only to guess whether a regex definition could own a step whose text still holds angle-bracket variables, and pickles remove the question. It is also where L2 and L4 lived. |
| maskEscapedParens | `src/index.js:288` | REPLACE | Deleted with the heuristic it serves; nothing else calls it. |
| asScenarioText | `src/index.js:293` | REPLACE | Deleted with the heuristic it serves; nothing else calls it. |
| holdsCapturingGroup | `src/index.js:414` | REPLACE | Deleted with the heuristic it serves; nothing else calls it. |
| evaluateStepFuncEndVsScenarioEnd | `src/index.js:417` | REPLACE | Deleted with the heuristic it serves; nothing else calls it. |
| injectVariable | `src/index.js:439` | EXTEND | Becomes the single capture path for plain scenarios and outline rows alike, keeping the presence-not-type argument forwarding from the L3 fix at src/index.js:476-483 and dropping the two arity-0 pass-through branches that existed only for the done-callback heuristic. |
| matchJestTestSuiteWithCucumberFeature | `src/index.js:170` | REPLACE | Its shape follows the jest-cucumber split of a parsed feature into scenarios and scenarioOutlines. Pickles are one flat list, so src/test-registration.js replaces it with a single loop. |
| matchJestTestWithCucumberScenario | `src/index.js:189` | REPLACE | Built around the verb object jest-cucumber passes into a scenario callback. Fusion now binds and invokes the steps itself, so that callback shape disappears. |
| callsites | `src/index.js:100` | REUSE | The caller-resolution port and the M4 robustness fix move into src/feature-source.js unchanged, and they are why loadRelativePath is already a no-op: Fusion always resolves relative to the first frame outside the package and passes an absolute path. |
| parseStepArgument | `node_modules/jest-cucumber/dist/src/parsed-feature-loading.js:57` | REPLACE | The real current owner of the data-table-to-row-objects and docstring-to-string transform, and the site of the truthiness test at lines 96-97 that loses an empty docstring inside an outline. Reimplemented in src/step-argument.js against the pickle shape. The locator is the vendored dist this value removes. |
| defineScenario | `node_modules/jest-cucumber/dist/src/feature-definition-creation.js:113` | REPLACE | The real current owner of sequential step execution and the byte-identical failing-step decoration. Reimplemented in src/test-registration.js as an awaited chain. Fusion contributes no sequencing today, so this is the responsibility most easily missed. |
| getJestCucumberConfiguration | `node_modules/jest-cucumber/dist/src/configuration.js:26` | REPLACE | The real current owner of the defaults and the errors true normalisation. Reimplemented in src/configuration.js for the per-call path only; its global object is left to value 5. |
| compile | `package.json:25` | REUSE | The Gherkin pickle compiler, reused as-is for outline expansion, Background and Rule collapse, substitution and i18n. The locator is the dependency pin that fixes the API, because the installed dist layout differs between the 28 line present now and the 39.1.0 line being pinned. |
| IdGenerator.incrementing | `package.json:25` | REUSE | Replaces the jest-cucumber use of uuid v4 as the AstBuilder id source, one of the two uuid entry points. A local counter is an equally valid carrier; either removes the dependency. |
| applyTagFilters | `node_modules/jest-cucumber/dist/src/tag-filtering.js:57` | CREATE_NEW | Not replaced at this value. Tag filtering has no consumer until value 3, which creates src/tag-filter.js over @cucumber/tag-expressions, so nothing here reimplements it and no tagFilter option is honoured yet. |
| generateStepCode | `node_modules/jest-cucumber/dist/src/code-generation/step-generation.js:74` | CREATE_NEW | Not replaced at this value. Value 2 creates src/code-suggestion.js for the Fusion-idiom starter code; value 1 only has to keep an unmatched step failing as loudly as it does today. |

### Prefactoring (Value 1: Fusion runs the existing feature corpus on pinned Gherkin pickles, with jest-cucumber removed)

Existing oracle:
`test/specs/features/step-definitions/scenario-outlines.steps.js`

Move: Extract the step-matching and capture-injection functions from
src/index.js into the new src/step-matching.js, required back by src/index.js,
with no behaviour change and jest-cucumber still wired as the engine. The
functions moved are findMatchingStep (src/index.js:235), isFunctionForScenario
(src/index.js:267) and injectVariable (src/index.js:439) together with the
heuristic helpers they call (src/index.js:284-437). No signature, no condition
and no message changes in the move; the heuristic is deleted afterwards, once
the pickle path is in place.

Preserved observation: The 2.0.0 outline behaviour is unchanged across the move:
every outline step in test/specs/features/scenario-outlines.feature still binds,
each Examples row still receives its own captures, and
test/specs/features/step-definitions/scenario-outlines.steps.js exits 0 with the
same describe title and the same ordered list of generated test names, repeats
kept in place, both before the move and on the after-move-before-behaviour
state.

Preservation uses the same existing test and support content before and after
the move, before behavior changes.

Preservation verification command:

```sh
npm ci
```

Preservation verification command:

```sh
npx jest test/specs/features/step-definitions/scenario-outlines.steps.js --coverage=false
```

### Agreement analysis (Value 1: Fusion runs the existing feature corpus on pinned Gherkin pickles, with jest-cucumber removed)

| Contract | Role | Locator | Decision | Reason |
|---|---|---|---|---|
| Gherkin pickle compilation API and pickle shape | producer | `package.json:25` | MIGRATED | The dependency declaration is where this repository owns the Gherkin version and therefore the pickle API and pickle shape Fusion consumes. It migrates from @cucumber/gherkin 28 reached transitively through jest-cucumber to @cucumber/gherkin 39.1.0 with @cucumber/messages 32.3.1 declared directly, the last CommonJS-loadable line. node_modules is untracked, so the declaration rather than the vendored dist is the honest locator. |
| Gherkin pickle compilation API and pickle shape | consumer | `src/index.js:115` | MIGRATED | This is where Fusion consumes a parsed feature today, through the jest-cucumber loadFeature rather than from the compiler directly. It migrates into src/feature-source.js, which parses and compiles pickles itself, shapes the step arguments and reads the Gherkin keyword back through astNodeIds. |
| internal feature-loading and test-registration seam | producer | `src/index.js:114` | MIGRATED | The require of jest-cucumber with its loadFeature and defineFeature pair is the seam eight test files mock. It is replaced by src/feature-source.js and src/test-registration.js, which are internal module paths and not a reinstated runner option. |
| internal feature-loading and test-registration seam | consumer | `test/specs/features/step-definitions/m1-before-hooks-clobber.steps.js:24` | MIGRATED | Mocks src/test-registration.js instead, its real observation point for hook wiring. |
| internal feature-loading and test-registration seam | consumer | `test/specs/features/step-definitions/hook-error.steps.js:20` | MIGRATED | Mocks src/test-registration.js instead; the throwing-hook observation is unchanged. |
| internal feature-loading and test-registration seam | consumer | `test/specs/features/step-definitions/m3-singleton-reset.steps.js:57` | MIGRATED | Mocks both new seams, keeping the synchronous collection fidelity that makes reset-after-load observable. |
| internal feature-loading and test-registration seam | consumer | `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js:31` | MIGRATED | Mocks both new seams to isolate the handling of an unmatched step; its assertion is unchanged at this value. |
| internal feature-loading and test-registration seam | consumer | `test/specs/features/step-definitions/ambiguous-step-shadowing.steps.js:31` | MIGRATED | Mocks both new seams; the ambiguity refusal it drives is Fusion-owned and unchanged. |
| internal feature-loading and test-registration seam | consumer | `test/specs/features/step-definitions/m4-callsite-resolution.steps.js:34` | MIGRATED | Mocks src/feature-source.js to observe the resolved absolute path; its callsites mock is untouched. |
| internal feature-loading and test-registration seam | consumer | `test/specs/features/step-definitions/l2-outline-edge-cases.steps.js:92` | MIGRATED | Stops mocking anything and drives the new test/specs/features/l2-outline-edge-cases.feature through the public surface, with an assertion on the arguments the step received, because the heuristic it was written to pin is deleted. |
| internal feature-loading and test-registration seam | consumer | `test/specs/features/step-definitions/l4-escaped-parens-outline.steps.js:69` | MIGRATED | Stops mocking anything for the same reason and drives the new test/specs/features/l4-escaped-parens-outline.feature; the escaped-paren case becomes an ordinary concrete-text match. |
| Fusion public options object | producer | `src/index.js:97` | MIGRATED | The options object keeps its shape but is now interpreted by src/configuration.js instead of being forwarded to the jest-cucumber loadFeature. runner leaves the public types and loadRelativePath becomes an explicit no-op. The errors semantics are deliberately unchanged at this value. |
| Fusion public options object | consumer | `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js:64` | UNCHANGED_COMPATIBLE | It passes errors false and asserts that Fusion throws on the unmatched step. Value 1 preserves that behaviour exactly, so its expectation holds unchanged; value 2 is what migrates it to a visible skip. |
| Fusion public options object | consumer | `test/specs/features/step-definitions/m3-singleton-reset.steps.js:265` | UNCHANGED_COMPATIBLE | Case F relies on a Fusion call throwing on an unmatched step under errors false. Value 1 keeps that throw, so the clean-slate invariant is still observable through the same trigger. |
| Fusion public options object | consumer | `test/specs/features/step-definitions/l2-outline-edge-cases.steps.js:139` | MIGRATED | Its Fusion call passes options through a staged fake feature. The call site is rewritten to load ../l2-outline-edge-cases.feature, so the consumption point moves even though the option semantics do not. |
| Fusion public options object | consumer | `test/specs/features/step-definitions/l4-escaped-parens-outline.steps.js:121` | MIGRATED | The same shape as l2, options plus a staged fake feature, and the call site moves to ../l4-escaped-parens-outline.feature for the same reason. |
| public TypeScript surface of the package | producer | `src/index.d.ts:34` | MIGRATED | The options type is derived from the jest-cucumber loadFeature today, at src/index.d.ts:7 and 34. Both lines go: the options interface is declared locally and runner is dropped. setFusionConfiguration is added at value 5, not here. |
| public TypeScript surface of the package | consumer | `test-d/index.test-d.ts:2` | UNCHANGED_COMPATIBLE | It asserts only the step verbs and the StepChain return type, none of which change, so it must keep compiling unmodified. That is why npm run test-d is a vector. |

### Impact closure (Value 1: Fusion runs the existing feature corpus on pinned Gherkin pickles, with jest-cucumber removed)

- manifest: `package.json`; CHANGED: jest-cucumber removed from dependencies and
  the Gherkin and messages pins added. jest.testMatch is unchanged, so the new
  oracles under test/specs/arch, test/specs/contract and test/specs/features are
  discovered without a discovery change.
- lock: `package-lock.json`; CHANGED: Regenerated so npm ci in the clean
  verification checkout installs the pinned line and no uuid path remains.
- public_interface: `src/index.js`; CHANGED: Loses the jest-cucumber require,
  loadFeature and defineFeature calls and the outline heuristic, and gains the
  per-call configuration merge and the two port calls. The verbs, registry,
  duplicate guard, hook registration and reset keep their behaviour.
- public_interface: `src/index.d.ts`; CHANGED: The jest-cucumber type import and
  the options type derived from it are replaced by a locally declared options
  interface, runner is removed and loadRelativePath is documented as a no-op.
- runtime: `src/configuration.js`; CHANGED: New module owning the defaults, the
  per-call merge and the errors true normalisation.
- runtime: `src/feature-source.js`; CHANGED: New driven port owning path
  resolution, file reading, parsing, pickle compilation, the keyword index and
  argument shaping.
- runtime: `src/keywords.js`; CHANGED: New module resolving an AST step keyword
  through the Gherkin dialects onto one of the five registry buckets, or
  refusing.
- runtime: `src/step-argument.js`; CHANGED: New module turning a pickle step
  argument into the row-object array or string a consumer step receives,
  preserving the empty string and the empty array.
- runtime: `src/step-matching.js`; CHANGED: New module created by the
  prefactoring move, receiving the extracted matching and capture code and then
  losing the heuristic.
- runtime: `src/test-registration.js`; CHANGED: New driven port owning describe
  and test registration, hook wiring, sequential awaited execution and the
  byte-identical failing-step decoration.
- test: `test/specs/features/step-definitions/m1-before-hooks-clobber.steps.js`;
  MIGRATED: Crafter-owned migration from mocking jest-cucumber to mocking
  src/test-registration.js, preserving the hook-order observation.
- test: `test/specs/features/step-definitions/hook-error.steps.js`; MIGRATED:
  Crafter-owned migration to mocking src/test-registration.js, preserving the
  throwing-hook observation.
- test: `test/specs/features/step-definitions/m3-singleton-reset.steps.js`;
  MIGRATED: Crafter-owned migration to mocking both seams, keeping cases A to F
  and the synchronous collection fidelity.
- test:
  `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js`;
  MIGRATED: Crafter-owned migration to mocking both seams; the assertion itself
  is unchanged at this value.
- test:
  `test/specs/features/step-definitions/ambiguous-step-shadowing.steps.js`;
  MIGRATED: Crafter-owned migration to mocking both seams; the ambiguity refusal
  is unchanged.
- test: `test/specs/features/step-definitions/m4-callsite-resolution.steps.js`;
  MIGRATED: Crafter-owned migration to mocking src/feature-source.js, keeping
  the callsites mock.
- test: `test/specs/features/step-definitions/l2-outline-edge-cases.steps.js`;
  MIGRATED: Crafter-owned migration to driving
  test/specs/features/l2-outline-edge-cases.feature with no fake, since the
  heuristic it pinned is deleted.
- test:
  `test/specs/features/step-definitions/l4-escaped-parens-outline.steps.js`;
  MIGRATED: Crafter-owned migration to driving
  test/specs/features/l4-escaped-parens-outline.feature with no fake, for the
  same reason.
- fixture: `test/specs/features/l2-outline-edge-cases.feature`; CHANGED: New
  Gherkin fixture created with the l2 migration and driven by
  test/specs/features/step-definitions/l2-outline-edge-cases.steps.js, carrying
  the outline edge cases that file currently stages as a fabricated parsed
  feature.
- fixture: `test/specs/features/l4-escaped-parens-outline.feature`; CHANGED: New
  Gherkin fixture created with the l4 migration and driven by
  test/specs/features/step-definitions/l4-escaped-parens-outline.steps.js,
  carrying the escaped-paren outline case that file currently stages.
- consumer: `src/index.js:115`; MIGRATED: The parsed-feature consumption point
  for the Gherkin pickle contract moves out of src/index.js into
  src/feature-source.js, which compiles pickles directly against the pinned
  version.
- consumer:
  `test/specs/features/step-definitions/m1-before-hooks-clobber.steps.js:24`;
  MIGRATED: The seam mock line itself is rewritten onto
  src/test-registration.js.
- consumer: `test/specs/features/step-definitions/hook-error.steps.js:20`;
  MIGRATED: The seam mock line itself is rewritten onto
  src/test-registration.js.
- consumer:
  `test/specs/features/step-definitions/m3-singleton-reset.steps.js:57`;
  MIGRATED: The seam mock line itself is rewritten onto both new seams.
- consumer:
  `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js:31`;
  MIGRATED: The seam mock line itself is rewritten onto both new seams.
- consumer:
  `test/specs/features/step-definitions/ambiguous-step-shadowing.steps.js:31`;
  MIGRATED: The seam mock line itself is rewritten onto both new seams.
- consumer:
  `test/specs/features/step-definitions/m4-callsite-resolution.steps.js:34`;
  MIGRATED: The seam mock line itself is rewritten onto src/feature-source.js.
- consumer:
  `test/specs/features/step-definitions/l2-outline-edge-cases.steps.js:92`;
  MIGRATED: The seam mock line is removed entirely as the file moves onto
  test/specs/features/l2-outline-edge-cases.feature.
- consumer:
  `test/specs/features/step-definitions/l4-escaped-parens-outline.steps.js:69`;
  MIGRATED: The seam mock line is removed entirely as the file moves onto
  test/specs/features/l4-escaped-parens-outline.feature.
- consumer:
  `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js:64`;
  UNCHANGED_COMPATIBLE: Its errors false expectation is preserved by this value,
  so the Fusion call and the assertion around it stay as they are.
- consumer:
  `test/specs/features/step-definitions/m3-singleton-reset.steps.js:265`;
  UNCHANGED_COMPATIBLE: Case F keeps its trigger because the errors false throw
  is preserved at this value.
- consumer:
  `test/specs/features/step-definitions/l2-outline-edge-cases.steps.js:139`;
  MIGRATED: The Fusion call site moves from a staged fake feature onto
  ../l2-outline-edge-cases.feature.
- consumer:
  `test/specs/features/step-definitions/l4-escaped-parens-outline.steps.js:121`;
  MIGRATED: The Fusion call site moves from a staged fake feature onto
  ../l4-escaped-parens-outline.feature.
- test: `test-d/index.test-d.ts:2`; UNCHANGED_COMPATIBLE: Asserts only the step
  verbs and the StepChain return type, none of which change; npm run test-d
  keeps it honest without being edited.

### Architectural tests (Value 1: Fusion runs the existing feature corpus on pinned Gherkin pickles, with jest-cucumber removed)

The following checks falsify the declared obligations using the linked native
verification command.

Obligation: No file anywhere under src/ requires jest-cucumber. The check
enumerates the src/ tree as it exists rather than a fixed module list, so the
modules values 2 and 3 add are covered when they arrive without editing the law.

Test locator: `test/specs/arch/dependency-direction.steps.js`

Verification command index: `6`

Obligation: Only src/feature-source.js requires @cucumber/gherkin,
@cucumber/messages, node:fs or callsites, and only src/test-registration.js
references a Jest global such as describe, test, beforeEach or afterEach. Every
other module under src/ references none of them, so the dependency direction is
inward and the parser stays swappable behind one port.

Test locator: `test/specs/arch/dependency-direction.steps.js`

Verification command index: `6`

Obligation: src/index.js exports exactly Given, When, Then, And, But, Before,
After and Fusion, and nothing else, so the dropped runner option is not
reintroduced as an export and the two internal seams stay internal.
setFusionConfiguration joins this set only at the value that adds it.

Test locator: `test/specs/arch/dependency-direction.steps.js`

Verification command index: `6`

### Contract tests (Value 1: Fusion runs the existing feature corpus on pinned Gherkin pickles, with jest-cucumber removed)

The following checks falsify the declared obligations using the linked native
verification command.

Obligation: The pickle facts Fusion depends on hold for the pinned Gherkin
version, observed by running the real installed compiler rather than a fixture:
one pickle per Examples row, the outline title and step text and data-table
cells substituted, Background and Rule backgrounds collapsed in, feature and
Examples tags unioned onto the pickle, an empty docstring preserved as the empty
string, and astNodeIds present on every pickle step so the Gherkin keyword can
be recovered.

Test locator: `test/specs/contract/gherkin-pickles.steps.js`

Verification command index: `7`

Contract: Gherkin pickle compilation API and pickle shape

Producer: `package.json:25`; consumer: `src/index.js:115`

Observation: Compiling a feature that holds a Background, a Rule with its own
Background, two same-titled scenarios and a Scenario Outline whose step carries
an empty docstring and a data table yields pickles whose names and step texts
are the substituted ones, whose step argument for the docstring step is the
empty string and not undefined, and each of whose steps carries at least one
astNodeId resolving to an AST step with a Gherkin keyword.

### Architecture decision record (Value 1: Fusion runs the existing feature corpus on pinned Gherkin pickles, with jest-cucumber removed)

Not applicable: The architectural decision for this whole Request is already
recorded and accepted in the shared section, at
docs/feature/drop-jest-cucumber/architecture/brief.md under the heading Shared
contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with
no jest-cucumber. This value implements that decision rather than taking a new
one, and a second ADR would be a competing copy of the same choice.

### Boundaries (Value 1: Fusion runs the existing feature corpus on pinned Gherkin pickles, with jest-cucumber removed)

- Driving port: The CommonJS module surface of src/index.js as required by a
  consumer .steps.js file collected by their own Jest: Given, When, Then, And,
  But, Before, After and Fusion, all called synchronously at module load, with
  the Jest run itself as the observation surface for everything Fusion
  registers.
- Driven port: Feature file bytes read through node:fs by src/feature-source.js.
- Driven port: Gherkin parsing and pickle compilation through @cucumber/gherkin
  39.1.0 and @cucumber/messages 32.3.1, reached only from src/feature-source.js.
- Driven port: The Jest globals describe, test, beforeEach and afterEach,
  reached only from src/test-registration.js.
- Driven port: Caller stack introspection through callsites, reached only from
  src/feature-source.js.
- Driven port: The npm registry and the packing of this package, reached only
  from the acceptance-owned script
  test/specs/baseline/assert-packaged-consumer.js and never from src/.
- Dependency direction: Inward. A consumer .steps.js depends on src/index.js;
  src/index.js depends on src/configuration.js, src/keywords.js,
  src/step-argument.js and src/step-matching.js, and on the two driven ports;
  the ports depend on those core modules and on the external packages. Nothing
  in the core depends on a port, on node:fs, on @cucumber/gherkin or on a Jest
  global, and nothing in src/ depends on jest-cucumber. The two ports do not
  depend on each other: src/feature-source.js produces a LoadedFeature value
  that src/index.js hands to src/test-registration.js.
- Failure: Condition: The resolved feature file does not exist. | Outcome:
  Refusal | Observation: Fusion throws at collection with the message Feature
  file not found followed by the absolute path in parentheses, byte-identical to
  today, plus the resolved base directory as a HOW, and the registry is left
  clean.
- Failure: Condition: The feature file is not valid Gherkin. | Outcome: Refusal
  | Observation: Fusion throws at collection with the message Error parsing
  feature Gherkin followed by the parser message, the wording preserved from
  today.
- Failure: Condition: A feature step matches no registered definition in its
  keyword bucket. | Outcome: Refusal | Observation: The failure stays exactly as
  loud as it is today at this value, so
  test/specs/features/step-definitions/undefined-step.steps.js keeps passing on
  its present assertion that the message mentions a step definition. The
  Fusion-idiom starter code and the skip route arrive at value 2.
- Failure: Condition: Two registered definitions in the same keyword bucket
  match one step text. | Outcome: Refusal | Observation: The existing ambiguous
  step definition error, naming the step text, the count and every competing
  matcher.
- Failure: Condition: The same matcher is registered twice for one keyword. |
  Outcome: Refusal | Observation: The existing duplicate step definition error,
  naming the matcher and the keyword.
- Failure: Condition: A step Gherkin keyword resolves to no registry bucket,
  reachable through the asterisk step that every Gherkin dialect allows. |
  Outcome: Refusal | Observation: A named refusal stating the unsupported
  keyword and the five keywords Fusion supports, instead of the bare TypeError
  raised today by Object.keys on an undefined bucket at src/index.js:238.
- Failure: Condition: A step function throws or its returned promise rejects. |
  Outcome: Refusal | Observation: The test fails with the byte-identical
  decoration of a Failing step line carrying the step text, a Step arguments
  line carrying the JSON of the arguments and an Error line carrying the
  original message, and no later step in that scenario runs.
- Failure: Condition: The consumer Jest or Node cannot require the pinned
  CommonJS cucumber packages, for example after someone bumps them to an
  ESM-only major. | Outcome: Indeterminate | Observation: The require fails at
  collection with the loader own message about having to use import to load an
  ES module, before Fusion can read anything, so Fusion makes no claim about the
  feature at all. This is the named residue of the CommonJS pin and the reason
  the versions are exact.
- Failure: Condition: The packaged-consumer observation cannot be made, because
  packing fails, the temporary project cannot be created, or the registry is
  unreachable. | Outcome: Indeterminate | Observation:
  test/specs/baseline/assert-packaged-consumer.js prints which step could not
  run and exits non-zero, so the value is adjudicated rather than reported
  green. It never exits 0 on an observation it did not make.

### Acceptance supports (Value 1: Fusion runs the existing feature corpus on pinned Gherkin pickles, with jest-cucumber removed)

- `test/specs/features/shared-contract.feature`
- `test/specs/baseline/test-names-2.0.0.txt`
- `test/specs/baseline/assert-test-names.js`
- `test/specs/baseline/assert-no-advisory-dependency.js`
- `test/specs/baseline/assert-packaged-consumer.js`
- `test/specs/arch/dependency-direction.steps.js`
- `test/specs/contract/gherkin-pickles.steps.js`

### Public oracle (Value 1: Fusion runs the existing feature corpus on pinned Gherkin pickles, with jest-cucumber removed)

Observation: A clean consumer project running Jest 30 on Node 22 that installs
this package from the packed tarball has no dependency path to jest-cucumber and
none to uuid, and gets the whole Fusion lifecycle from the package alone: the
repository feature corpus still runs, every describe title and ordered list of
test names Fusion generates from a feature file is byte-identical to the 2.0.0
run with repeats kept in place, a failing step reports the 2.0.0 text, and a
scenario outline row whose step carries an empty docstring receives the empty
string instead of losing the argument.

Stimulus: From a clean checkout: npm ci, then npx jest on
test/specs/features/step-definitions/shared-contract.steps.js, which is an
ordinary consumer step definition file that requires src/index.js, registers
Given, And and But definitions and calls Fusion on
test/specs/features/shared-contract.feature, a feature holding a Background, a
Rule with its own Background, a data table and a Scenario Outline whose step
carries an empty docstring. Then npx jest over the whole repository, then node
test/specs/baseline/assert-no-advisory-dependency.js, then node
test/specs/baseline/assert-test-names.js, then node
test/specs/baseline/assert-packaged-consumer.js, which packs the repository,
installs the tarball into a fresh temporary project outside the repository and
runs that project own jest and npm ls, then the architectural and contract
vectors, then npm run test-d.

Expected: jest exits 0 for the oracle file, reporting its scenarios under a
describe named for the feature title, one test per Examples row carrying the
substituted title, with the outline step receiving the row value followed by the
empty string, the data-table step receiving an array of header-keyed row
objects, the And and But definitions bound only to And and But steps, Before and
After running exactly once per test, and a deliberately failing step reporting
the Failing step, Step arguments and Error lines unchanged. The whole repository
suite exits 0. assert-no-advisory-dependency.js prints that the production tree
holds no jest-cucumber and no uuid and exits 0. assert-test-names.js prints that
every suite recorded in test/specs/baseline/test-names-2.0.0.txt is still
present and still generates an identical ordered list of names and exits 0.
assert-packaged-consumer.js prints the tarball it packed, the temporary project
it installed into, that neither jest-cucumber nor uuid resolves there and that
the consumer jest run exited 0, then removes its temporary directory and exits
0\. The architectural vector exits 0, the contract vector exits 0 and npm run
test-d exits 0.

Falsifier: The empty docstring arriving as undefined, a data table arriving as
raw pickle cells, an And definition binding to a Given step, a hook running more
than once per test, or one changed byte of the failing-step decoration makes the
oracle file fail. Leaving jest-cucumber or any uuid in the production tree makes
assert-no-advisory-dependency.js exit non-zero, and leaving it in the packed
tarball dependency tree makes assert-packaged-consumer.js exit non-zero even if
the repository tree looks clean. Renaming or reordering any name Fusion
generates from a feature file, dropping the substituted outline title,
collapsing the three identically named Selling all of one tests into one, or
deleting a baseline suite, makes assert-test-names.js exit non-zero. Reinstating
a require of jest-cucumber under src/, or reaching for @cucumber/gherkin,
node:fs or a Jest global from a core module, makes the architectural vector exit
non-zero. Deleting the heuristic in a way that unbinds a step definition which
currently binds makes the whole-repository vector exit non-zero, which is how
risk R4 is falsified. Reintroducing runner or exporting a seam makes the
architectural vector exit non-zero, and bumping the Gherkin pin to an ESM-only
major makes the contract vector fail at require time.

### Oracle and verification (Value 1: Fusion runs the existing feature corpus on pinned Gherkin pickles, with jest-cucumber removed)

Oracle target locator:
`test/specs/features/step-definitions/shared-contract.steps.js`
Oracle verification command index: `1`

Verification command:

```sh
npm ci
```

Verification command:

```sh
npx jest test/specs/features/step-definitions/shared-contract.steps.js --coverage=false
```

Verification command:

```sh
npx jest --coverage=false
```

Verification command:

```sh
node test/specs/baseline/assert-no-advisory-dependency.js
```

Verification command:

```sh
node test/specs/baseline/assert-test-names.js
```

Verification command:

```sh
node test/specs/baseline/assert-packaged-consumer.js
```

Verification command:

```sh
npx jest test/specs/arch/dependency-direction.steps.js --coverage=false
```

Verification command:

```sh
npx jest test/specs/contract/gherkin-pickles.steps.js --coverage=false
```

Verification command:

```sh
npm run test-d
```

## Value 2: Fusion owns the unmatched-step refusal, its starter code, the visible skip, and the duplicate-title check

### Purpose (Value 2: Fusion owns the unmatched-step refusal, its starter code, the visible skip, and the duplicate-title check)

Give the errors option real behaviour for the first time: one Fusion-owned
refusal that names every unbound step in a feature at once and carries starter
code in Fusion's own verb idiom, a visible skipped test instead of that refusal
when the consumer switches the step check off, and a duplicate-scenario-title
check gated by the second key, defined over scenario definitions rather than
generated test names so the three identically named Examples rows in the 2.0.0
baseline stay accepted.

### Constraints (Value 2: Fusion owns the unmatched-step refusal, its starter code, the visible skip, and the duplicate-title check)

- An unmatched step surfaces where it does today: as a synchronous refusal out
  of Fusion at collection time, before any describe is registered.
  src/test-registration.js:17-24 binds every step of every scenario before
  src/test-registration.js:66 registers anything, and that ordering is the
  reason the existing guards work. No test is fabricated to carry the failure.
- The refusal message keeps the phrase No step definition matches followed by
  the step text in double quotes as the first line of each entry, so
  test/specs/features/step-definitions/undefined-step.steps.js:37 keeps passing
  on its present assertion, and the two regex assertions at
  m5-errors-false-silent-skip.steps.js:89 and m3-singleton-reset.steps.js:271
  stay satisfiable. That wording is a designed constraint, not an accident.
- One refusal reports every unbound step in the feature, numbered, each with its
  own starter code. Refusing on the first one bills the consumer a full re-run
  per missing definition.
- Switching the step check off, by errors false or by errors with
  stepsMustMatchFeatureFile false, registers the affected scenario through
  test.skip under its own unannotated name. It is never a passing test and never
  an absent one. Scenarios in the same feature whose steps all bind still run
  normally.
- Two scenarios of the same title means two scenario or outline DEFINITIONS in
  one feature file whose declared names are equal ignoring case. Expanded
  Examples rows are never counted: one Scenario Outline contributes exactly one
  title, its declared un-substituted one, however many rows it has. The three
  tests named Selling all of one from
  test/specs/features/scenario-outlines.feature:16-26 therefore stay accepted,
  as they were in 2.0.0.
- Rule-nested scenario and outline definitions take part in the duplicate check,
  flattened, the same way the removed intermediary flattened them and the same
  way src/feature-source.js:91-103 already descends into a Rule.
- This value adds no public export and no new option key. tagFilter stays inert
  until value 3, scenarioNameTemplate until value 4, and setFusionConfiguration
  until value 5.
- The ambiguous-step refusal and the unsupported-keyword refusal are not
  switchable by errors and keep their present wording and timing.
- Every describe title and ordered list of test names that Fusion generates from
  a feature file in the 2.0.0 baseline is still byte-identical, so the duplicate
  check must not reject a feature the baseline depends on.
- The whole repository suite exits 0 at the end of this value. No expectation
  names a suite or test count.
- Negative observations are made through Jest's own report on a real consumer
  file, and every check exits 0 only when the refusal or the skip actually
  happened.

### Targets (Value 2: Fusion owns the unmatched-step refusal, its starter code, the visible skip, and the duplicate-title check)

| Path | Decision | Reason |
|---|---|---|
| `src/code-suggestion.js` | CREATE_NEW | Owns what to tell a consumer whose step binds nothing: the starter code for one step, and the whole numbered refusal for a list of unbound steps. It reuses the argument-detection idea of the removed intermediary (code-generation/step-generation.js:5 for the pattern, :21-23 for escaping, :30-38 for the number and quoted-string substitutions, :43-49 for the arg naming and :50-57 for the table and docString parameter names) but emits Fusion's verb form instead of the test callback form at scenario-generation.js:7. Pure: no filesystem, no parser, no Jest global. |
| `src/step-matching.js` | EXTEND | Carrier change at src/step-matching.js:12-42. Today no match throws immediately (src/step-matching.js:23-24), which cannot express the state this value needs: unbound, and tolerated. findMatchingStep returns a result that is either a bound step or an unbound step carrying the reason, and the ambiguity refusal at :26-33 and the capture path at :51-74 are untouched. Moving the decision out of here is what lets one caller see every unbound step at once. |
| `src/test-registration.js` | EXTEND | Becomes the one place the errors decision is taken, because it is where both outcomes live. boundScenarios at :17-24 collects unbound steps instead of letting the first one throw; registerFeature at :58 takes the merged options and either raises the single numbered refusal built by src/code-suggestion.js before any describe, or registers the affected scenarios with test.skip while the rest keep their ordinary test. The failing-step decoration at :30-35, the hook registration at :53-56 and the empty-feature short circuit at :64 are untouched. |
| `src/feature-source.js` | EXTEND | Gains the duplicate-title check, because this is the only module that can see a scenario DEFINITION: astScenariosById at :91-103 already descends into Rule children and holds the AST nodes whose declared names the check compares. loadFeature at :152 already receives the merged options and the comment at :150-151 records that no key governed it yet; scenariosMustMatchFeatureFile is the first that does. The pickle path, the keyword recovery and the registration order at :124-148 are untouched. |
| `src/configuration.js` | EXTEND | mergeFusionOptions at :33-37 assigns at the top level, so a consumer who writes errors with only stepsMustMatchFeatureFile false silently loses scenariosMustMatchFeatureFile as well, which would switch the duplicate check off without being asked. An object-valued errors now merges key-wise over the defaults at :13-17, so naming one key means that key and nothing more. The boolean false keeps meaning every validation off, and the true expansion at :30-31 is unchanged. |
| `src/index.js` | EXTEND | The call at src/index.js:121 passes the merged options on to testRegistration.registerFeature, which now needs them to take the errors decision. The merge itself already happens at :114, so this is the one line that changes; the registry, the verbs and the unconditional reset at :122-128 are untouched and no export is added. |
| `src/index.d.ts` | EXTEND | The FusionErrorOptions doc comment at :30-36 says only stepsMustMatchFeatureFile governs a live behaviour. That stops being true here: scenariosMustMatchFeatureFile gates the duplicate-title check. The comment states what each of the three keys now does, that allowScenariosNotInFeatureFile remains vestigial, and that an object-valued errors merges key-wise. No type shape changes, so test-d/index.test-d.ts keeps compiling unmodified. |
| `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js` | EXTEND | Its assertion at :89 that Fusion throws under errors false is exactly what ruling 6 reverses, so the file must change or it fails by design. It keeps its purpose, that nothing is bound for a step no definition owns (the negative at :95), and its test-registration double at :43-61 is updated for the new binding result it reads through jest.requireActual at :51. The authoritative never-a-passing-test observation is not here; it is in the acceptance-owned report script, which the crafter does not write. |
| `test/specs/features/step-definitions/m3-singleton-reset.steps.js` | EXTEND | Case F at :259-275 relies on errors false making an unmatched step throw, which it no longer does. Its invariant, that a Fusion which throws still leaves a clean slate, is unaffected; only the trigger moves to the default path, where an unmatched step still refuses. The double's binding model at :82-88 is updated like m5's. Cases A to E are untouched. |

### Paradigm (Value 2: Fusion owns the unmatched-step refusal, its starter code, the visible skip, and the duplicate-title check)

procedural

### Decisions (Value 2: Fusion owns the unmatched-step refusal, its starter code, the visible skip, and the duplicate-title check)

- Where the unmatched-step refusal surfaces: at collection, synchronously out of
  Fusion, exactly as it does today. The value text reads that npx jest fails
  that test, and a collection refusal does fail the run and does carry the
  message; registering a test whose body throws would instead fabricate a
  behavioural failure for what is a wiring defect, and it would break the three
  guards that capture the throw. The skip route is the one case that must
  register, and it does.
- Which test files must change, and who owns them: undefined-step.steps.js needs
  NO change, and that is a design constraint rather than luck, because the new
  refusal keeps the phrase No step definition matches as the first line of each
  entry and its assertion at :37 is a case-insensitive match on step definition.
  m5-errors-false-silent-skip.steps.js and m3-singleton-reset.steps.js must
  change and are crafter targets, because their edits are mechanical
  consequences of the ruled semantics and their observations are seam-level.
  Neither is an acceptance support, so targets and supports stay disjoint and no
  value-1 support is touched.
- The judge stays separate from the judged on this value's central promise. The
  never-a-passing-test observation, the starter-code shape and the
  duplicate-title behaviour are all falsified by acceptance-owned files the
  crafter does not write: the oracle, and
  test/specs/baseline/assert-validation-report.js, which reads Jest's own JSON
  report from child runs over real consumer files.
- How the skip is observed: Jest's own report, not an internal spy.
  assert-validation-report.js invokes jest in a child process against one
  fixture consumer file at a time with an explicit testMatch, reads the JSON
  report, and asserts the named scenario's status is the skipped one and not the
  passed one. A spy on test.skip would prove only that Fusion called a function.
- Why the negative fixtures are named .fixture.js: the repository runner selects
  every .steps.js file (package.json:74), so a fixture that must FAIL
  collection, like the duplicate-title one, would break the whole-repository
  vector if it were collected. The .fixture.js extension keeps it out of the
  ordinary run while the report script reaches it with an explicit testMatch,
  and it needs no change to the Jest configuration.
- Reject all at once: one refusal names every unbound step in the feature,
  numbered, each with its own starter code. Refusing on the first one, as
  src/step-matching.js:23-24 does today, bills the consumer one full dispatch
  per missing definition, and the message would be telling the truth about a
  fraction of the state.
- The carrier for an unbound step changes rather than being wrapped in a flag. A
  throw cannot represent unbound-and-tolerated, which is precisely the state
  errors with stepsMustMatchFeatureFile false asks for, so findMatchingStep
  returns a bound-or-unbound result and the decision moves to the caller that
  holds the option. Adding a boolean parameter to the throwing function would
  have left the first unbound step unable to reach the decision at all.
- The duplicate-title check runs over scenario and outline DEFINITIONS, compared
  case-insensitively, which is what the removed intermediary did at
  scenario-validation.js:8 and :14-17 over a list holding one entry per outline
  rather than one per row. Comparing generated test names instead would reject
  test/specs/features/scenario-outlines.feature:16-26, whose single outline
  produces three tests all named Selling all of one, and those three names are
  in the 2.0.0 baseline. This distinction is the whole correctness of the check,
  so a fixture observes the exemption directly rather than leaving it to the
  suite.
- An outline's declared title may still hold angle-bracket placeholders while
  its rows do not. The check compares the declared title, so two outlines
  declared with the same placeholder-bearing title are duplicates, and one
  outline whose rows differ is not.
- The duplicate refusal states WHAT, WHY and HOW: the title and how many times
  it is declared, that Fusion generates one test per scenario so two same-titled
  scenarios cannot be told apart in a report, and that renaming one or setting
  scenariosMustMatchFeatureFile false accepts the file. Every duplicated title
  in the feature is named in that one refusal.
- errors false keeps meaning every validation off, so it switches off the
  duplicate check as well as the step check. That is the only reading consistent
  with it being a shorthand for the object.
- An object-valued errors now merges key-wise over the defaults. Today
  src/configuration.js:34 replaces the whole errors object, so a consumer
  writing only stepsMustMatchFeatureFile false also silently loses the duplicate
  check. The removed intermediary behaved the same way, so this is a deliberate
  improvement rather than a restoration, and it is the sort of change a release
  note names.
- Only the scenarios whose steps fail to bind are skipped. A feature whose other
  scenarios bind cleanly still registers and runs them, so switching the check
  off costs the consumer only the tests that are genuinely unwired.
- Starter code is emitted in Fusion's verb idiom, keyed on the step's own
  recovered keyword bucket, so an And step suggests And and a But step suggests
  But. A step text with no detectable argument suggests the verb with the text
  as a double-quoted string and an arrow function with an empty body; a text
  holding a number or a double-quoted substring suggests an anchored
  slash-delimited regex with a capture group per detected argument and one arg
  parameter each; a step carrying a data table or a docstring adds a table or
  docString parameter after the captures.
- The placeholder branch of the intermediary's argument-detection pattern
  (code-generation/step-generation.js:5, third alternative) is dead for Fusion
  and is not carried over: step text reaching the suggestion is already
  substituted for its Examples row, so no angle brackets survive to detect.
- The architectural law bound at value 1 already covers the module this value
  adds, because test/specs/arch/dependency-direction.steps.js enumerates the
  src/ tree rather than a fixed module list, so src/code-suggestion.js is
  checked without the law or its oracle being edited. This value runs that
  specification as a verification vector and claims the obligation, but owns no
  byte of it.
- No value-1 acceptance support is edited.
  test/specs/baseline/assert-test-names.js and its baseline, the arch
  specification and the pickle contract specification are run as vectors and
  left alone, so value 1's recorded oracle witness stays valid. The new suites
  this value adds carry no baseline entry and are excluded from the name
  comparison by its own stated rule.
- Verification starts with npm ci as its own vector, because des verify builds a
  clean temporary checkout with nothing installed.

### Reuse analysis (Value 2: Fusion owns the unmatched-step refusal, its starter code, the visible skip, and the duplicate-title check)

| Symbol | Locator | Decision | Reason |
|---|---|---|---|
| findMatchingStep | `src/step-matching.js:12` | EXTEND | The owner of which definition binds a step. It keeps its lookup, its ambiguity refusal and its capture injection; only its answer for no match changes, from an immediate throw to an unbound result its caller can collect. |
| boundScenarios | `src/test-registration.js:17` | EXTEND | Already the bind-before-register pass, and therefore already the place where every step of every scenario is visited once. Collecting the unbound ones here is what makes one refusal for the whole feature possible. |
| registerFeature | `src/test-registration.js:58` | EXTEND | Already owns the describe, the hooks, the per-scenario test and the empty-feature short circuit. It gains the merged options and the choice between refusing and registering a skipped test, which is the only place both outcomes are reachable. |
| registerHooks | `src/test-registration.js:53` | REUSE | Hook registration once per feature is untouched. A feature with skipped scenarios still registers its hooks once, and Jest does not run them for a skipped test. |
| decorate | `src/test-registration.js:30` | REUSE | The failing-step decoration is byte-identical and this value does not go near it. A skipped scenario never reaches it, and a refusal is not a step failure. |
| mergeFusionOptions | `src/configuration.js:33` | EXTEND | The owner of the merge, and the first value at which any errors key governs behaviour. It gains a key-wise merge for an object-valued errors so a partially specified object does not switch off the keys it did not mention. |
| everyValidationOn | `src/configuration.js:13` | REUSE | The expansion of errors true already spells out the three keys, so both of this value's checks read the same object whichever form the consumer wrote. Nothing in it changes. |
| astScenariosById | `src/feature-source.js:91` | EXTEND | Already descends into Rule children and holds every AST scenario node, which is exactly the definition-level view the duplicate check needs and the only one available anywhere in the package. It gains the declared names in document order. |
| loadFeature | `src/feature-source.js:152` | EXTEND | Already receives the merged options, with a comment at :150-151 recording that no key governed this port yet. It raises the duplicate refusal when scenariosMustMatchFeatureFile is on, before any pickle work is wasted. |
| bucketForKeyword | `src/keywords.js:35` | REUSE | The recovered bucket is what tells the starter code which verb to suggest, so the suggestion inherits the keyword resolution rather than re-deriving it. The module is untouched. |
| stepArgumentFrom | `src/step-argument.js:33` | REUSE | The shaped step argument is what tells the starter code whether to add a table or a docString parameter, read by presence, so an empty docstring still adds one. The module is untouched. |
| generateStepCode | `node_modules/jest-cucumber/dist/src/code-generation/step-generation.js:74` | REPLACE | The real previous owner of starter-code generation, which emitted its own test callback idiom. Its argument-detection pattern, escaping, substitutions and parameter naming are carried into src/code-suggestion.js; its output form is not. The locator is the vendored dist value 1 removed, which is why this is a reimplementation rather than a reuse. |
| ensureFeatureFileAndStepDefinitionScenarioHaveSameSteps | `node_modules/jest-cucumber/dist/src/validation/step-definition-validation.js:16` | REPLACE | The real previous owner of the default-path unmatched-step failure, which worked indirectly by comparing step COUNTS and so could not say which step was unbound. Fusion knows exactly which steps failed to bind, so the refusal names them instead of counting them. |
| checkThatFeatureFileAndStepDefinitionsHaveSameScenarios | `node_modules/jest-cucumber/dist/src/validation/scenario-validation.js:35` | REPLACE | The real previous owner of the duplicate-title rejection, which found it as a side effect of matching step definitions back to the feature at :14-17 over a definition-level list. Fusion generates the scenarios, so only that one residue is live and it is implemented directly. |
| getTestFunction | `node_modules/jest-cucumber/dist/src/feature-definition-creation.js:101` | REPLACE | The real previous owner of choosing test.skip over test. Reimplemented in src/test-registration.js for the one reason this value has, a scenario whose steps do not bind while the check is off; the only, concurrent and pending routes it also carried are not reintroduced. |

### Prefactoring (Value 2: Fusion owns the unmatched-step refusal, its starter code, the visible skip, and the duplicate-title check)

Not applicable: No minimal preserving move is available. This value's whole
delta is behavioural: a new refusal, a new skip route and a new validation. Its
one structural change, turning the no-match throw at src/step-matching.js:23-24
into a returned result, alters the observable control flow of every caller by
construction, including the two test doubles that call it through
jest.requireActual at m5-errors-false-silent-skip.steps.js:51 and
m3-singleton-reset.steps.js:82, so it cannot be measured as behaviour-preserving
against any existing green oracle. The extraction that was available,
src/step-matching.js itself, was declared and measured at value 1.

### Agreement analysis (Value 2: Fusion owns the unmatched-step refusal, its starter code, the visible skip, and the duplicate-title check)

| Contract | Role | Locator | Decision | Reason |
|---|---|---|---|---|
| step binding result returned by src/step-matching.js | producer | `src/step-matching.js:12` | MIGRATED | Its answer for an unbound step changes from a thrown error to a returned result carrying the reason, so every caller that distinguished success from a throw must now read the result instead. |
| step binding result returned by src/step-matching.js | consumer | `src/test-registration.js:22` | MIGRATED | The bind-before-register pass stops relying on the throw and collects the unbound results, which is what lets one refusal name every unbound step in the feature. |
| step binding result returned by src/step-matching.js | consumer | `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js:51` | MIGRATED | Its test-registration double calls the real matcher through jest.requireActual and pushes what it answers, so the double must read the new result shape to keep modelling the real port faithfully. |
| step binding result returned by src/step-matching.js | consumer | `test/specs/features/step-definitions/m3-singleton-reset.steps.js:82` | MIGRATED | The same double in the registry-reset regression, for the same reason. |
| merged Fusion options handed to the driven ports | producer | `src/configuration.js:33` | MIGRATED | An object-valued errors now merges key-wise over the defaults instead of replacing them, so both ports receive a complete three-key object whatever subset the consumer wrote. |
| merged Fusion options handed to the driven ports | consumer | `src/feature-source.js:152` | MIGRATED | It already receives the merged options and ignored them; scenariosMustMatchFeatureFile is the first key it reads, to decide whether a duplicate declared title is a refusal. |
| merged Fusion options handed to the driven ports | consumer | `src/test-registration.js:58` | MIGRATED | It receives the merged options for the first time, because stepsMustMatchFeatureFile decides between the refusal and the skipped test and only this module can take either action. |
| Fusion public options object | producer | `src/index.js:107` | MIGRATED | The option shape is unchanged, but errors stops being inert: errors false and stepsMustMatchFeatureFile false now produce a visible skipped test rather than a refusal, and scenariosMustMatchFeatureFile now gates a check. Breaking, and a release note names it. |
| Fusion public options object | consumer | `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js:89` | MIGRATED | It asserts that Fusion throws under errors false, which is the behaviour this value deliberately reverses, so its expectation moves to a registered skipped test while its negative, that nothing was bound, stays. |
| Fusion public options object | consumer | `test/specs/features/step-definitions/m3-singleton-reset.steps.js:271` | MIGRATED | Case F used errors false as its throwing trigger. The clean-slate invariant is unchanged, so the trigger moves to the default path where an unmatched step still refuses. |
| public TypeScript surface of the package | producer | `src/index.d.ts:37` | MIGRATED | The FusionErrorOptions documentation is now wrong: it says only stepsMustMatchFeatureFile is live. The comment is corrected and the key-wise merge is documented. The declared types do not change. |
| public TypeScript surface of the package | consumer | `test-d/index.test-d.ts:2` | UNCHANGED_COMPATIBLE | It asserts the step verbs and the StepChain return type only, and no declared type changes here, so it must keep compiling unmodified. That is why npm run test-d stays a vector. |

### Impact closure (Value 2: Fusion owns the unmatched-step refusal, its starter code, the visible skip, and the duplicate-title check)

- runtime: `src/code-suggestion.js`; CHANGED: New module owning the starter code
  for one unbound step and the numbered refusal for a list of them.
- runtime: `src/step-matching.js`; CHANGED: No match returns an unbound result
  instead of throwing; the ambiguity refusal and the capture path are untouched.
- runtime: `src/test-registration.js`; CHANGED: Collects unbound steps, takes
  the errors decision, and either raises one refusal before any describe or
  registers the affected scenarios with test.skip.
- runtime: `src/feature-source.js`; CHANGED: Gains the duplicate declared-title
  check over AST scenario definitions, Rule children included, gated by
  scenariosMustMatchFeatureFile.
- runtime: `src/configuration.js`; CHANGED: An object-valued errors merges
  key-wise over the defaults, so a partially written object no longer switches
  off the keys it did not name.
- public_interface: `src/index.js`; CHANGED: Passes the merged options on to
  registerFeature. One line; no export added and the registry and reset are
  untouched.
- public_interface: `src/index.d.ts`; CHANGED: The FusionErrorOptions
  documentation is corrected for the now-live second key and the key-wise merge.
  No declared type changes.
- test:
  `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js`;
  MIGRATED: Crafter-owned: its errors false assertion moves from a throw to a
  registered skipped test, and its double reads the new binding result.
- test: `test/specs/features/step-definitions/m3-singleton-reset.steps.js`;
  MIGRATED: Crafter-owned: case F's trigger moves to the default path, and its
  double reads the new binding result. Cases A to E are untouched.
- consumer: `src/test-registration.js:22`; MIGRATED: Reads the unbound result
  instead of relying on a throw.
- consumer: `src/test-registration.js:58`; MIGRATED: Receives the merged options
  for the first time, to take the errors decision.
- consumer: `src/feature-source.js:152`; MIGRATED: Reads
  scenariosMustMatchFeatureFile, the first option key to govern this port.
- consumer:
  `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js:51`;
  MIGRATED: Its double reads the new binding result through jest.requireActual.
- consumer:
  `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js:89`;
  MIGRATED: Its errors false expectation becomes a registered skipped test
  rather than a throw.
- consumer:
  `test/specs/features/step-definitions/m3-singleton-reset.steps.js:82`;
  MIGRATED: Its double reads the new binding result through jest.requireActual.
- consumer:
  `test/specs/features/step-definitions/m3-singleton-reset.steps.js:271`;
  MIGRATED: Case F's throwing trigger moves from errors false to the default
  path.
- test: `test-d/index.test-d.ts:2`; UNCHANGED_COMPATIBLE: No declared type
  changes, so it keeps compiling unmodified and npm run test-d keeps it honest.

### Architectural tests (Value 2: Fusion owns the unmatched-step refusal, its starter code, the visible skip, and the duplicate-title check)

The following checks falsify the declared obligations using the linked native
verification command.

Obligation: src/code-suggestion.js, the one module this value adds, requires
nothing outside the process and names no Jest global, so the pure core stays
pure as it grows. The law enumerates the src/ tree rather than a fixed module
list, so it already covers the new module and neither the law nor its
specification file is edited by this value.

Test locator: `test/specs/arch/dependency-direction.steps.js`

Verification command index: `5`

### Contract tests (Value 2: Fusion owns the unmatched-step refusal, its starter code, the visible skip, and the duplicate-title check)

Not applicable: The pickle-shape contract with the pinned Gherkin version was
bound and specified at value 1 and is unchanged here. The only new parser facts
this value depends on, that the AST holds one scenario node per declared
definition and that a Rule's children are descended, are already observed end to
end through the public driving port by the duplicate-title and outline-exemption
fixtures that test/specs/baseline/assert-validation-report.js drives, so a
second lower-level check of the same fact would be a competing authority rather
than new evidence.

### Architecture decision record (Value 2: Fusion owns the unmatched-step refusal, its starter code, the visible skip, and the duplicate-title check)

Not applicable: The architectural decision for this Request is already recorded
and accepted in the shared section, at
docs/feature/drop-jest-cucumber/architecture/brief.md under the heading Shared
contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with
no jest-cucumber, and the errors semantics this value implements are ruling 6 of
docs/feature/drop-jest-cucumber/plan.md. This value implements those decisions
rather than taking a new one.

### Boundaries (Value 2: Fusion owns the unmatched-step refusal, its starter code, the visible skip, and the duplicate-title check)

- Driving port: The CommonJS module surface of src/index.js as required by a
  consumer .steps.js file collected by their own Jest: Given, When, Then, And,
  But, Before, After and Fusion, called synchronously at module load, with
  Jest's own run report as the observation surface for what Fusion registered,
  refused or skipped.
- Driven port: Feature file bytes, Gherkin parsing and pickle compilation,
  reached only from src/feature-source.js.
- Driven port: The Jest globals describe, test, test.skip, beforeEach and
  afterEach, reached only from src/test-registration.js.
- Driven port: Caller stack introspection through callsites, reached only from
  src/feature-source.js.
- Driven port: A child Jest process and its JSON report, reached only from the
  acceptance-owned script test/specs/baseline/assert-validation-report.js and
  never from src/.
- Dependency direction: Unchanged and inward. src/index.js depends on
  src/configuration.js and on the two driven ports; src/test-registration.js
  depends on src/step-matching.js and now on src/code-suggestion.js;
  src/code-suggestion.js depends on nothing. No core module reaches the
  filesystem, the parser or a Jest global, and the two ports still do not depend
  on each other.
- Failure: Condition: A feature step matches no registered definition in its
  keyword bucket, and stepsMustMatchFeatureFile is on. | Outcome: Refusal |
  Observation: One refusal out of Fusion at collection, before any describe,
  naming every unbound step in the feature, numbered, each entry opening with
  the phrase No step definition matches and the step text in double quotes and
  carrying starter code in Fusion's verb idiom for that step's own keyword.
- Failure: Condition: A feature step matches no registered definition and
  stepsMustMatchFeatureFile is off, by errors false or by the explicit key. |
  Outcome: Refusal | Observation: The affected scenario is registered through
  test.skip under its own unannotated name, so Jest reports it skipped and never
  passed, while the other scenarios of the same feature register and run
  normally.
- Failure: Condition: Two scenario or outline definitions in one feature file
  declare the same title, ignoring case, and scenariosMustMatchFeatureFile is
  on. | Outcome: Refusal | Observation: One refusal out of Fusion at collection,
  before any describe, naming every duplicated title and how many times each is
  declared, why two same-titled scenarios cannot be told apart in a Jest report,
  and both ways to proceed. No test of that file runs.
- Failure: Condition: Two scenario or outline definitions declare the same title
  and scenariosMustMatchFeatureFile is off, or errors is false. | Outcome:
  Refusal | Observation: The file is accepted and both scenarios register and
  run, producing two tests of the same name, which is what the consumer asked
  for by switching the check off.
- Failure: Condition: One Scenario Outline produces several Examples rows whose
  generated test names are identical, because its declared title holds no
  placeholder. | Outcome: Refusal | Observation: Not a duplicate and never
  refused. The check compares declared definitions, so the outline contributes
  one title; the three tests named Selling all of one in the 2.0.0 baseline keep
  registering and running under the default.
- Failure: Condition: Two registered definitions in the same keyword bucket
  match one step text. | Outcome: Refusal | Observation: The existing ambiguous
  step definition refusal, unchanged in wording and timing, and not switchable
  by errors.
- Failure: Condition: A step's Gherkin keyword resolves to no registry bucket. |
  Outcome: Refusal | Observation: The existing unsupported step keyword refusal,
  unchanged, and not switchable by errors.
- Failure: Condition: A step function throws or its returned promise rejects. |
  Outcome: Refusal | Observation: The byte-identical failing-step decoration,
  untouched by this value, and no later step of that scenario runs.
- Failure: Condition: The acceptance report script cannot make its observation,
  because a child Jest process cannot be started or its JSON report cannot be
  read. | Outcome: Indeterminate | Observation:
  test/specs/baseline/assert-validation-report.js prints which child run it
  could not make and exits non-zero, so the value is adjudicated rather than
  reported green. It never exits 0 on an observation it did not make.

### Acceptance supports (Value 2: Fusion owns the unmatched-step refusal, its starter code, the visible skip, and the duplicate-title check)

- `test/specs/features/v2-unmatched-step-suggestion.feature`
- `test/specs/baseline/assert-validation-report.js`
- `test/specs/fixtures/unbound-step.feature`
- `test/specs/fixtures/unbound-step-default.fixture.js`
- `test/specs/fixtures/unbound-step-errors-false.fixture.js`
- `test/specs/fixtures/unbound-step-steps-key-false.fixture.js`
- `test/specs/fixtures/duplicate-titles.feature`
- `test/specs/fixtures/duplicate-titles-default.fixture.js`
- `test/specs/fixtures/duplicate-titles-key-false.fixture.js`
- `test/specs/fixtures/outline-rows-not-duplicates.feature`
- `test/specs/fixtures/outline-rows-not-duplicates.fixture.js`

### Public oracle (Value 2: Fusion owns the unmatched-step refusal, its starter code, the visible skip, and the duplicate-title check)

Observation: A consumer whose feature step binds no definition gets one
Fusion-owned refusal that names every unbound step in that feature and hands
back starter code they can paste in Fusion's own verb idiom, with the right verb
for each step's keyword and a capture group and parameter for each argument the
step text or its Gherkin argument implies. Switching the step check off, with
errors false or with stepsMustMatchFeatureFile false, turns that scenario into a
test Jest reports as skipped and never as passed, while its siblings still run.
A feature file declaring two scenarios of the same title is refused by default
and accepted when scenariosMustMatchFeatureFile is false, and a Scenario Outline
whose rows share one generated name is never a duplicate.

Stimulus: From a clean checkout: npm ci, then npx jest on
test/specs/features/step-definitions/v2-unmatched-step-suggestion.steps.js, an
ordinary consumer step definition file that registers one definition and calls
Fusion on test/specs/features/v2-unmatched-step-suggestion.feature, whose
scenarios hold deliberately unbound steps of several shapes: plain text, text
carrying a number, text carrying a double-quoted substring, a step with a data
table, a step with a docstring, and an And step. It catches the collection
refusal and asserts on its text. Then npx jest over the whole repository. Then
node test/specs/baseline/assert-validation-report.js, which runs jest in a child
process once per fixture consumer file under test/specs/fixtures with an
explicit testMatch and reads the JSON report: the unbound-step fixture under the
default, under errors false and under stepsMustMatchFeatureFile false; the
duplicate-title fixture under the default and with scenariosMustMatchFeatureFile
false; and the outline-rows fixture under the default. Then node
test/specs/baseline/assert-test-names.js, then the architectural vector, then
npm run test-d.

Expected: jest exits 0 for the oracle file: the captured refusal names all six
unbound steps in one message, numbered, each entry opening with the phrase No
step definition matches and that step's text in double quotes; the plain step's
snippet is the verb with the text as a double-quoted string and an arrow
function with an empty body; the number-bearing and quote-bearing steps suggest
an anchored slash-delimited regex with one capture group and one arg parameter
per detected argument; the data-table step adds a table parameter and the
docstring step adds a docString parameter after any captures; and the And step
suggests And rather than Given. The whole repository suite exits 0, including
the three tests named Selling all of one. assert-validation-report.js prints one
line per child run and exits 0: the default unbound run fails and its message
carries the snippet; both switched-off unbound runs exit 0 with that scenario
reported skipped, not passed, and the sibling scenario reported passed; the
default duplicate run fails naming the duplicated title and runs no test of that
file; the switched-off duplicate run exits 0 with both same-named tests passed;
and the outline-rows run exits 0 under the default with every row passed.
assert-test-names.js exits 0, the architectural vector exits 0 and npm run
test-d exits 0.

Falsifier: Refusing on the first unbound step instead of all of them, emitting
the removed intermediary's test callback idiom instead of Fusion's verb,
suggesting Given for an And step, omitting the capture group for a number or a
quoted substring, or omitting the table or docString parameter, each makes the
oracle file fail. Making the switched-off path pass the scenario, or drop it
entirely instead of skipping it, makes assert-validation-report.js exit non-zero
on the run that reads Jest's own status. Failing to refuse a duplicated declared
title under the default, or refusing it when the key is false, fails the
matching child run. Comparing generated test names instead of declared
definitions makes the outline-rows child run fail and also makes the
whole-repository vector and assert-test-names.js fail, because the three
identically named Selling all of one tests would be rejected. Letting an
object-valued errors replace the defaults rather than merge key-wise makes the
stepsMustMatchFeatureFile-only child run also lose the duplicate check, which
that run observes. Changing the first line of an unbound entry so it no longer
carries the phrase No step definition matches makes
test/specs/features/step-definitions/undefined-step.steps.js fail in the
whole-repository vector. Reaching for the filesystem, the parser or a Jest
global from src/code-suggestion.js makes the architectural vector exit non-zero.

### Oracle and verification (Value 2: Fusion owns the unmatched-step refusal, its starter code, the visible skip, and the duplicate-title check)

Oracle target locator:
`test/specs/features/step-definitions/v2-unmatched-step-suggestion.steps.js`
Oracle verification command index: `1`

Verification command:

```sh
npm ci
```

Verification command:

```sh
npx jest test/specs/features/step-definitions/v2-unmatched-step-suggestion.steps.js --coverage=false
```

Verification command:

```sh
npx jest --coverage=false
```

Verification command:

```sh
node test/specs/baseline/assert-validation-report.js
```

Verification command:

```sh
node test/specs/baseline/assert-test-names.js
```

Verification command:

```sh
npx jest test/specs/arch/dependency-direction.steps.js --coverage=false
```

Verification command:

```sh
npm run test-d
```

## Value 3: tagFilter selects scenarios through real tag expressions, and the excluded ones are reported skipped

### Purpose (Value 3: tagFilter selects scenarios through real tag expressions, and the excluded ones are reported skipped)

Make tagFilter do what the documentation has always claimed: a scenario the
expression excludes is registered as a skipped test under its own name rather
than run or dropped, tags are matched ignoring case as they were before, and a
malformed expression is refused at collection. The expression language comes
from the real @cucumber/tag-expressions parser instead of the hand-rolled
rewriter the removed intermediary used.

### Constraints (Value 3: tagFilter selects scenarios through real tag expressions, and the excluded ones are reported skipped)

- @cucumber/tag-expressions is pinned exactly to 9.1.0. A probe of the registry
  confirmed it publishes main as the CommonJS build and an exports map carrying
  an explicit require condition, with no dependencies of its own, so require
  works from this package under Jest 30 on Node 22.
- src/tag-filter.js must not require @cucumber/tag-expressions, because the
  architectural law bound at value 1 exempts only src/feature-source.js from
  reaching anything whose name starts with the cucumber scope
  (test/specs/arch/dependency-direction.steps.js:38-50 and :204-228). The port
  requires the library and injects its parse function, so the new module stays
  pure and the law needs no edit.
- A scenario the filter excludes is registered through test.skip under its own
  unannotated name. It is never run and never absent, so a reader of the Jest
  report sees the scenario that was excluded as well as the one that ran.
- The scenario tag set is the union of the scenario's own tags, its feature's
  tags and, for an Examples row, that Examples set's tags, because a compiled
  pickle already unions all three. That is the same set the removed intermediary
  assembled by hand.
- Tags and the expression are both lowercased before matching, which keeps the
  case-insensitivity the previous engine had.
- A malformed tagFilter is refused at collection, and the first line keeps the
  phrase Could not parse tag filter followed by the expression in double quotes,
  the wording a consumer may already be greping for.
- When tagFilter is undefined, nothing about loading or registration changes, so
  every existing suite and every name in the 2.0.0 baseline is untouched by this
  value.
- This value adds no public export and no new option key. tagFilter is already
  declared in the public types; only its documentation and its behaviour change.
  scenarioNameTemplate stays inert until value 4 and setFusionConfiguration
  until value 5.
- No value 1 or value 2 oracle or support file is edited. The architectural
  specification, the pickle contract specification, the name baseline and its
  script, and the value 2 validation report script are run as verification
  vectors and left byte-identical, so their recorded witnesses stay valid.
- The whole repository suite exits 0 at the end of this value. No expectation
  names a suite or test count.
- Negative and report-level observations are made through Jest's own JSON report
  on real consumer files, and every check exits 0 only when the behaviour it
  names actually happened.

### Targets (Value 3: tagFilter selects scenarios through real tag expressions, and the excluded ones are reported skipped)

| Path | Decision | Reason |
|---|---|---|
| `package.json` | EXTEND | Add @cucumber/tag-expressions pinned exactly to 9.1.0 to the dependencies block at package.json:25, alongside the gherkin and messages pins already there. Exact, for the same reason those are exact: the majors past this one publish ESM only and Jest 30 on Node 22 cannot require them. |
| `package-lock.json` | EXTEND | npm ci in the clean verification checkout resolves from the lock, so the new pin has to be recorded here or the first vector fails before anything else runs. |
| `src/tag-filter.js` | CREATE_NEW | The pure half of tag filtering, as the shared contract names it: given an expression and a parse function injected by the port, it returns a predicate over a scenario's tag list, lowercasing both sides so matching ignores case, and it builds the refusal when the expression will not parse. It requires nothing at all, which is what keeps the architectural law intact without editing it. |
| `src/feature-source.js` | EXTEND | The one module the law lets reach the library, so it requires @cucumber/tag-expressions in the block at src/feature-source.js:14-18 and hands its parse function to src/tag-filter.js. loadFeature at :213 reads tagFilter, the key its own comment at :210-212 says arrives with the module that owns tag expressions, and marks each scenario it returns with whether the filter excluded it. The duplicate-title check at :224-227 stays where it is, before the pickles and before any tag is known. |
| `src/test-registration.js` | EXTEND | Two changes, both in registerFeature at :69-97. A scenario the filter excluded takes the same test.skip route an unbound scenario already takes at :93, with one registration whichever reason applies, so a scenario that is both excluded and unwired is registered once. And the unbound-step refusal at :77-80 counts only scenarios the filter kept, because a consumer who excluded a scenario is not asking for its steps to be bound. |
| `src/index.d.ts` | EXTEND | tagFilter is declared at src/index.d.ts:70 with no documentation. It gains a comment stating the expression language, that and, or, not and parentheses are supported, that matching ignores case, that the tag set includes the feature's and the Examples set's tags, and that an excluded scenario is reported as a skipped test. No declared type changes, so test-d/index.test-d.ts keeps compiling unmodified. |

### Paradigm (Value 3: tagFilter selects scenarios through real tag expressions, and the excluded ones are reported skipped)

procedural

### Decisions (Value 3: tagFilter selects scenarios through real tag expressions, and the excluded ones are reported skipped)

- Where the library is required: in src/feature-source.js, never in
  src/tag-filter.js. The architectural law bound at value 1 matches any require
  target beginning with the cucumber scope and exempts exactly one module
  (test/specs/arch/dependency-direction.steps.js:38-50, enforced at :204-228),
  so a tag-filter module that imported the parser itself would turn that
  specification red. Injecting the parse function keeps the new module pure,
  keeps the library behind the one port, and keeps the law unedited.
- What src/tag-filter.js owns: the normalisation and the predicate, not the
  parsing. It lowercases the expression and every tag before the comparison,
  turns a parse failure into the refusal message, and answers one question —
  does this tag set satisfy this expression. Everything it needs arrives as an
  argument, so it can be read and reasoned about without a parser, a file or a
  runner.
- The tag set comes from the compiled pickle, which already unions the
  scenario's tags, the feature's tags and the Examples set's tags. The removed
  intermediary assembled that union by hand in two places
  (tag-filtering.js:57-58 for scenario plus feature,
  parsed-feature-loading.js:125-131 for the Examples set). One source makes it
  correct by construction rather than by two agreeing lists.
- Only one boolean is added to the LoadedFeature value: whether the filter
  excluded the scenario. The tags themselves are deliberately not exposed yet,
  because the only other consumer of them is value 4's template variables, which
  needs the feature's tags separated from the scenario's; building that
  separation now would be a field with no reader. The port decides exclusion
  because the port is where the parser lives.
- That added field is optional and read by truthiness, so a test double that
  fabricates a LoadedFeature without it behaves exactly as it does today. That
  is why no existing test file is a target of this value:
  m5-errors-false-silent-skip.steps.js:102 and the builder at
  m3-singleton-reset.steps.js:110 stage features with no tag information and
  must keep passing untouched. The whole-repository vector is the falsifier for
  that claim.
- A scenario the filter excluded is exempt from the unbound-step refusal, which
  is what the removed intermediary did: it dropped tag-filtered scenarios before
  validating them (scenario-validation.js:54). The reason is the same one it had
  — a consumer who excluded a scenario is not asking for its steps to be bound —
  and the alternative would make a tag filter unable to exclude a half-written
  scenario, which is one of the main reasons to use one.
- An ambiguous step still refuses even in an excluded scenario, and that is not
  an inconsistency. Unbound is a property of the SCENARIO: this scenario's step
  has no owner, and excluding the scenario removes the question. Ambiguous is a
  property of the REGISTRY: two definitions both claim the same text, which is
  wrong whichever scenarios run, and there is no reading under which Fusion
  could pick one.
- A scenario that is both excluded by the filter and unwired is registered
  exactly once, as one skipped test. The two reasons share the single skip route
  rather than each registering, so no feature can produce two tests of the same
  name from one scenario.
- A feature whose every scenario the filter excludes still registers its
  describe, with every test skipped, because the previous engine marked rather
  than dropped and only short-circuited on a feature with no scenarios at all
  (feature-definition-creation.js:230-233). The empty-feature short circuit at
  src/test-registration.js:85 keeps its present meaning: no scenarios in the
  file, not none selected.
- The duplicate declared-title check stays before the pickles and therefore
  before any tag is known, so it is a property of the FILE and not of the
  selection. Otherwise adding a tag filter would silently make a file with two
  same-titled scenarios acceptable, and the consumer would have switched off a
  check they never named.
- Lowercasing the whole expression also lowercases its operators, which widens
  what parses: the previous rewriter matched and, or and not case-sensitively
  (tag-filtering.js:45-47), so an expression written with an uppercase AND
  failed there and succeeds here. That is a deliberate widening in the
  permissive direction, and it is strict: every expression that worked before
  still works.
- A malformed expression is a refusal at collection with the previous first line
  kept — Could not parse tag filter followed by the expression in double quotes
  — then WHY it could not be read and HOW to write one, naming the operators and
  parentheses that are supported. Keeping the first line means anything a
  consumer greps for still matches, and the rest is what the old single-line
  message never told them.
- The parse failure is caught where the parser is called and re-raised with that
  message, rather than being allowed to surface as the library's own error,
  because the library's wording is about its grammar and the consumer's question
  is about their option.
- When tagFilter is undefined the filter is not constructed and no scenario is
  marked, so loading and registration are byte-for-byte what value 2 left. That
  is what keeps every existing suite and every name in the 2.0.0 baseline
  untouched, and the name-baseline vector is its falsifier.
- The report-level observation needs its own acceptance script rather than an
  addition to value 2's. test/specs/baseline/assert-validation-report.js is a
  value 2 support, and editing it would move that value's recorded oracle
  witness, so this value adds test/specs/baseline/assert-tag-filter-report.js
  and runs the value 2 script unchanged as a verification vector.
- The primary oracle observes behaviour a step definition file can see — which
  scenarios' step functions actually ran — and the acceptance script observes
  what only Jest's report can show, one passed test and one skipped test under
  the excluded scenario's own name. Both are needed: a counter cannot see a
  test's reported status, and a report cannot see that the excluded scenario's
  body never executed.
- The fixtures the report script drives are named with a fixture extension so
  the repository runner, which selects every .steps.js file (package.json:74),
  does not collect them. The malformed-expression fixture in particular must
  fail collection, and collecting it would break the whole-repository vector.
- Verification starts with npm ci as its own vector, because des verify builds a
  clean temporary checkout with nothing installed.

### Reuse analysis (Value 3: tagFilter selects scenarios through real tag expressions, and the excluded ones are reported skipped)

| Symbol | Locator | Decision | Reason |
|---|---|---|---|
| loadFeature | `src/feature-source.js:213` | EXTEND | Already receives the merged options and already reads one of their keys for the duplicate check. tagFilter is the second, and its own comment at :210-212 predicted this. It gains the marking pass and nothing else; the read, parse, duplicate check, compile and keyword recovery stay in their present order. |
| registerFeature | `src/test-registration.js:69` | EXTEND | Already the one place the skip route and the refusal both live, and already takes the merged options. It gains one more reason to skip and one narrowing of which scenarios the refusal counts. |
| boundScenarios | `src/test-registration.js:21` | REUSE | Binding every step of every scenario up front is unchanged, and so is its reporting of unbound steps. Which of those steps the refusal counts is decided by its caller, not here, so this pass needs no knowledge of tags. |
| registerHooks | `src/test-registration.js:64` | REUSE | Hooks stay registered once per feature. Jest does not run a beforeEach for a skipped test, so a fully excluded feature registers its hooks and runs none of them, which is what the previous engine did. |
| decorate | `src/test-registration.js:41` | REUSE | The failing-step decoration is untouched. An excluded scenario never reaches it, and a refusal is not a step failure. |
| mergeFusionOptions | `src/configuration.js:44` | REUSE | tagFilter is already a default key at src/configuration.js:24 and already merges from the per-call options, so this value needs no change to the merge. It is the first value at which that key reaches a reader. |
| astScenarios | `src/feature-source.js:99` | REUSE | The definition-level view the duplicate check and the registration order are read off. Tag filtering works on compiled pickles instead, because only a pickle carries the unioned tag set, so this function is untouched. |
| duplicatedTitles | `src/feature-source.js:124` | REUSE | Unchanged and deliberately still evaluated before any tag is known, so the selection cannot make a duplicate-title file acceptable. |
| inRegistrationOrder | `src/feature-source.js:205` | REUSE | The plain-scenarios-then-Examples-rows partition that reproduces the 2.0.0 registration order. Marking a scenario excluded changes nothing about its position, so the order and therefore the reported names are untouched. |
| parse | `package.json:25` | REUSE | The tag expression parser of @cucumber/tag-expressions 9.1.0, reused as the whole expression language. The locator is the dependency pin that fixes the API, because node_modules is untracked and the pin is what this repository actually owns. |
| applyTagFilters | `node_modules/jest-cucumber/dist/src/tag-filtering.js:57` | REPLACE | The real previous owner of tag filtering. It compiled the expression into JavaScript with a function constructor over a string rewrite (:5-55), recognised tags only through a fixed character class, and matched its operators case-sensitively. Replaced by the real parser behind the port, with the lowercasing kept so matching stays case-insensitive. |
| setScenarioSkipped | `node_modules/jest-cucumber/dist/src/tag-filtering.js:47` | REPLACE | The real previous owner of the mark-rather-drop decision, which is the behaviour that makes an excluded scenario visible as skipped. Reimplemented as one field on the value the port hands back. |
| getTestFunction | `node_modules/jest-cucumber/dist/src/feature-definition-creation.js:101` | REPLACE | The real previous owner of choosing the skipping test function for a tag-filtered scenario (:102-104). Value 2 already reimplemented that route for an unwired scenario; this value points the second reason at the same route rather than adding a parallel one. |

### Prefactoring (Value 3: tagFilter selects scenarios through real tag expressions, and the excluded ones are reported skipped)

Not applicable: No minimal preserving move is available. The only structural
candidate would be extracting tag handling out of src/feature-source.js, and
there is nothing to extract: no tag code exists anywhere in src/ yet, as the
comment at src/feature-source.js:210-212 records. Everything this value adds is
new behaviour behind a new pure module, and the one existing function whose
control flow changes, registerFeature at src/test-registration.js:69, changes it
by gaining a second skip reason, which is behaviour rather than movement.

### Agreement analysis (Value 3: tagFilter selects scenarios through real tag expressions, and the excluded ones are reported skipped)

| Contract | Role | Locator | Decision | Reason |
|---|---|---|---|---|
| tag expression parsing API and its CommonJS require condition | producer | `package.json:25` | MIGRATED | The dependency declaration is where this repository owns which tag expression language it speaks. The responsibility migrates from the removed intermediary's hand-rolled rewriter to @cucumber/tag-expressions 9.1.0, pinned exactly because the majors past it publish ESM only and Jest cannot require those. node_modules is untracked, so the declaration is the honest locator. |
| tag expression parsing API and its CommonJS require condition | consumer | `src/feature-source.js:17` | MIGRATED | The require block of the one module the architectural law lets reach the cucumber scope. It gains the tag-expressions require and passes the parse function inward, so the library is consumed here and nowhere else. |
| the LoadedFeature value handed back by src/feature-source.js | producer | `src/feature-source.js:213` | MIGRATED | Each scenario gains one field recording whether the tag filter excluded it. The existing fields, title and steps with their keyword, text and argument, are unchanged. |
| the LoadedFeature value handed back by src/feature-source.js | consumer | `src/test-registration.js:21` | UNCHANGED_COMPATIBLE | The binding pass reads only the steps, which do not change, so it needs no knowledge of the new field. |
| the LoadedFeature value handed back by src/feature-source.js | consumer | `src/test-registration.js:90` | MIGRATED | The registration loop reads the new field to choose the skip route, which is the one place the exclusion becomes visible to a consumer. |
| the LoadedFeature value handed back by src/feature-source.js | consumer | `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js:102` | UNCHANGED_COMPATIBLE | It fabricates a LoadedFeature to isolate the unmatched-step handling. The new field is optional and read by truthiness, so a staged feature that omits it is treated exactly as it is today and this file is not edited. |
| the LoadedFeature value handed back by src/feature-source.js | consumer | `test/specs/features/step-definitions/m3-singleton-reset.steps.js:110` | UNCHANGED_COMPATIBLE | Its feature builder stages the same shape for the registry-reset regression, and for the same reason it is left byte-identical. |
| public TypeScript surface of the package | producer | `src/index.d.ts:70` | MIGRATED | tagFilter stops being an accepted but inert option, so its declaration gains documentation of the expression language, the case-insensitivity and the skipped-test outcome. The declared type stays a string. |
| public TypeScript surface of the package | consumer | `test-d/index.test-d.ts:2` | UNCHANGED_COMPATIBLE | It asserts the step verbs and the StepChain return type only, and no declared type changes here, so it must keep compiling unmodified. That is why npm run test-d stays a vector. |

### Impact closure (Value 3: tagFilter selects scenarios through real tag expressions, and the excluded ones are reported skipped)

- manifest: `package.json`; CHANGED: Adds @cucumber/tag-expressions pinned
  exactly to 9.1.0. jest.testMatch is unchanged, so the new oracle and contract
  specifications are discovered and the fixture files are not.
- lock: `package-lock.json`; CHANGED: Regenerated so npm ci in the clean
  verification checkout installs the new pin.
- runtime: `src/tag-filter.js`; CHANGED: New pure module owning the lowercasing
  normalisation, the predicate over a tag set, and the malformed-expression
  refusal, with the parse function injected.
- runtime: `src/feature-source.js`; CHANGED: Requires the tag expression
  library, injects its parse function, reads tagFilter and marks each returned
  scenario with whether the filter excluded it.
- runtime: `src/test-registration.js`; CHANGED: An excluded scenario takes the
  existing skip route, once, and the unbound-step refusal counts only the
  scenarios the filter kept.
- public_interface: `src/index.d.ts`; CHANGED: tagFilter gains documentation of
  the expression language, the case-insensitivity and the skipped-test outcome.
  No declared type changes.
- consumer: `src/feature-source.js:17`; MIGRATED: The require block of the one
  port allowed to reach the cucumber scope gains the tag expression library.
- consumer: `src/test-registration.js:21`; UNCHANGED_COMPATIBLE: The binding
  pass reads only steps, which do not change.
- consumer: `src/test-registration.js:90`; MIGRATED: The registration loop reads
  the new exclusion field to choose the skip route.
- consumer:
  `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js:102`;
  UNCHANGED_COMPATIBLE: Its staged feature omits the new optional field and is
  treated exactly as today, so the file is left byte-identical and its value 2
  record stays valid.
- consumer:
  `test/specs/features/step-definitions/m3-singleton-reset.steps.js:110`;
  UNCHANGED_COMPATIBLE: Its feature builder omits the new optional field for the
  same reason and is likewise left byte-identical.
- consumer: `test-d/index.test-d.ts:2`; UNCHANGED_COMPATIBLE: No declared type
  changes, so it keeps compiling unmodified and npm run test-d keeps it honest.

### Architectural tests (Value 3: tagFilter selects scenarios through real tag expressions, and the excluded ones are reported skipped)

The following checks falsify the declared obligations using the linked native
verification command.

Obligation: src/tag-filter.js requires nothing from the cucumber scope, the
filesystem or the caller stack: the parse function reaches it as an argument
from src/feature-source.js, which is the only module the law exempts. The law
enumerates the src/ tree rather than a fixed module list, so it already covers
the module this value adds, and neither the law nor its specification file is
edited here.

Test locator: `test/specs/arch/dependency-direction.steps.js`

Verification command index: `6`

Obligation: src/tag-filter.js names no Jest global, so the skip decision stays
reachable only from src/test-registration.js and the new module cannot register
anything itself.

Test locator: `test/specs/arch/dependency-direction.steps.js`

Verification command index: `6`

### Contract tests (Value 3: tagFilter selects scenarios through real tag expressions, and the excluded ones are reported skipped)

The following checks falsify the declared obligations using the linked native
verification command.

Obligation: The pinned tag expression library answers the way this value depends
on it, observed by running the real installed package rather than a fixture: it
can be reached by require from CommonJS under Jest, a parsed expression exposes
an evaluate that takes an array of tags, and, or, not and parentheses all behave
as the documentation claims, and a malformed expression raises rather than
quietly matching nothing.

Test locator: `test/specs/contract/tag-expressions.steps.js`

Verification command index: `7`

Contract: tag expression parsing API and its CommonJS require condition

Producer: `package.json:25`; consumer: `src/feature-source.js:17`

Observation: Requiring the pinned package from a CommonJS test file yields a
parse function; parsing an expression naming one included and one excluded tag
and evaluating it against a lowercased tag list answers true for the included
set and false for the excluded one; parenthesised and negated expressions answer
as stated; and an unparseable expression raises an error instead of returning a
matcher that answers false for everything, which is the failure mode that would
silently run no tests.

### Architecture decision record (Value 3: tagFilter selects scenarios through real tag expressions, and the excluded ones are reported skipped)

Not applicable: The architectural decision for this Request is recorded and
accepted in the shared section, at
docs/feature/drop-jest-cucumber/architecture/brief.md under the heading Shared
contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with
no jest-cucumber, and the choice of the real tag expression library wrapped to
stay case-insensitive is ruling 12 of docs/feature/drop-jest-cucumber/plan.md.
This value implements those decisions rather than taking a new one.

### Boundaries (Value 3: tagFilter selects scenarios through real tag expressions, and the excluded ones are reported skipped)

- Driving port: The CommonJS module surface of src/index.js as required by a
  consumer .steps.js file collected by their own Jest: Given, When, Then, And,
  But, Before, After and Fusion, called synchronously at module load, with
  Jest's own run report as the observation surface for which scenarios ran, were
  skipped, or were refused.
- Driven port: Feature file bytes, Gherkin parsing and pickle compilation,
  reached only from src/feature-source.js.
- Driven port: Tag expression parsing through @cucumber/tag-expressions 9.1.0,
  reached only from src/feature-source.js, which injects its parse function into
  src/tag-filter.js.
- Driven port: The Jest globals describe, test, test.skip, beforeEach and
  afterEach, reached only from src/test-registration.js.
- Driven port: Caller stack introspection through callsites, reached only from
  src/feature-source.js.
- Driven port: A child Jest process and its JSON report, reached only from the
  acceptance-owned script test/specs/baseline/assert-tag-filter-report.js and
  never from src/.
- Dependency direction: Unchanged and inward. src/index.js depends on
  src/configuration.js and on the two driven ports; src/feature-source.js
  depends on the external parsers and on the pure core, including the new
  src/tag-filter.js, to which it hands a parse function; src/tag-filter.js
  depends on nothing. No core module reaches the filesystem, a parser or a Jest
  global, and the two ports still do not depend on each other.
- Failure: Condition: The tagFilter expression cannot be parsed by the pinned
  library. | Outcome: Refusal | Observation: One refusal out of Fusion at
  collection, before any describe, whose first line reads Could not parse tag
  filter followed by the expression in double quotes, then why it could not be
  read and how to write one, naming and, or, not and parentheses. No test of
  that file runs.
- Failure: Condition: A scenario's tag set does not satisfy the expression. |
  Outcome: Refusal | Observation: That scenario is registered through test.skip
  under its own unannotated name, so Jest reports it skipped while its included
  siblings run. Its step functions never execute.
- Failure: Condition: Every scenario of a feature is excluded by the expression.
  | Outcome: Refusal | Observation: The describe is still registered, with every
  test skipped and the hooks registered once, which is what the previous engine
  produced. A feature with no scenarios at all still registers nothing.
- Failure: Condition: A scenario the filter excluded also has a step that binds
  no definition, with the step check on. | Outcome: Refusal | Observation: No
  unmatched-step refusal is raised for it, and it is registered once as a
  skipped test. A consumer who excluded a scenario is not asking for its steps
  to be bound, and the previous engine dropped excluded scenarios before
  validating them.
- Failure: Condition: A scenario the filter kept has a step that binds no
  definition. | Outcome: Refusal | Observation: The value 2 behaviour,
  unchanged: one refusal naming every unbound step of the kept scenarios with
  its starter code when the step check is on, or those scenarios registered as
  skipped tests when it is off.
- Failure: Condition: A step of any scenario, kept or excluded, matches two
  registered definitions. | Outcome: Refusal | Observation: The existing
  ambiguous step definition refusal, unchanged and not switchable, because two
  definitions claiming one text is a defect in the registry rather than in a
  scenario.
- Failure: Condition: A feature file declares two scenarios with the same title
  while a tag filter excludes one of them. | Outcome: Refusal | Observation:
  Still refused by default. The duplicate check runs over declared definitions
  before any tag is known, so a selection can never make a duplicate-title file
  acceptable.
- Failure: Condition: tagFilter is undefined. | Outcome: Refusal | Observation:
  No filter is constructed and no scenario is marked, so loading and
  registration are what value 2 left and every name in the 2.0.0 baseline is
  unchanged.
- Failure: Condition: The pinned tag expression library cannot be required, for
  example after someone bumps it to an ESM-only major. | Outcome: Indeterminate
  | Observation: The require fails at collection with the loader's own message
  about having to use import to load an ES module, before Fusion can read the
  feature, so Fusion makes no claim about it. This is the same residue the
  Gherkin pin carries and the reason this version is exact too.
- Failure: Condition: The acceptance report script cannot make its observation,
  because a child Jest process cannot be started or its JSON report cannot be
  read. | Outcome: Indeterminate | Observation:
  test/specs/baseline/assert-tag-filter-report.js prints which child run it
  could not make and exits non-zero, so the value is adjudicated rather than
  reported green. It never exits 0 on an observation it did not make.

### Acceptance supports (Value 3: tagFilter selects scenarios through real tag expressions, and the excluded ones are reported skipped)

- `test/specs/features/v3-tag-filter.feature`
- `test/specs/baseline/assert-tag-filter-report.js`
- `test/specs/contract/tag-expressions.steps.js`
- `test/specs/fixtures/tagged-scenarios.feature`
- `test/specs/fixtures/tag-filter-included.fixture.js`
- `test/specs/fixtures/tag-filter-mixed-case.fixture.js`
- `test/specs/fixtures/tag-filter-malformed.fixture.js`
- `test/specs/fixtures/tag-filter-unbound.feature`
- `test/specs/fixtures/tag-filter-unbound.fixture.js`

### Public oracle (Value 3: tagFilter selects scenarios through real tag expressions, and the excluded ones are reported skipped)

Observation: A consumer who calls Fusion with a tagFilter of one included tag
and not one excluded tag, on a feature holding one scenario of each, sees Jest
report one passed test and one skipped test, the skipped one listed under the
excluded scenario's own unannotated name, and the excluded scenario's step
functions never run. The same filter written in a different case selects the
same scenario. A filter that cannot be parsed is refused at collection with a
message whose first line names the expression.

Stimulus: From a clean checkout: npm ci, then npx jest on
test/specs/features/step-definitions/v3-tag-filter.steps.js, an ordinary
consumer step definition file that registers step definitions which record every
step they run, calls Fusion on test/specs/features/v3-tag-filter.feature with a
tagFilter of one included tag and not one excluded tag, and asserts in an
afterAll which steps ran; it also calls Fusion with a differently-cased filter
and, in a captured try, with a malformed expression. Then npx jest over the
whole repository. Then node test/specs/baseline/assert-tag-filter-report.js,
which runs jest in a child process once per fixture consumer file under
test/specs/fixtures with an explicit testMatch and reads the JSON report: the
tagged feature under the exact filter from the value text, the same feature
under a differently-cased filter, the same feature under a malformed expression,
and a feature whose excluded scenario carries an unbound step. Then node
test/specs/baseline/assert-validation-report.js and node
test/specs/baseline/assert-test-names.js unchanged, then the architectural and
contract vectors, then npm run test-d.

Expected: jest exits 0 for the oracle file: the included scenario's steps ran in
order, none of the excluded scenario's steps ran at all, the differently-cased
filter selected the same scenario, and the captured malformed-expression failure
opens with the phrase Could not parse tag filter followed by that expression in
double quotes. The whole repository suite exits 0, with every existing suite and
name unaffected because none passes a tagFilter. assert-tag-filter-report.js
prints one line per child run and exits 0: the filtered run reports exactly one
passed test and one skipped test, with the skipped one carrying the excluded
scenario's own name and no annotation added to it; the differently-cased run
reports the same two statuses under the same two names; the malformed run fails
with no test reported at all; and the run whose excluded scenario holds an
unbound step exits 0, reporting that scenario skipped exactly once and its
included sibling passed, with no unmatched-step refusal.
assert-validation-report.js exits 0, assert-test-names.js exits 0, the
architectural vector exits 0, the contract vector exits 0 and npm run test-d
exits 0.

Falsifier: Running the excluded scenario, or dropping it so no test is reported
for it, makes the oracle file and the report script disagree with the expected
statuses. Annotating the skipped test's name makes the report script exit
non-zero against the excluded scenario's own name. Matching tags
case-sensitively makes the differently-cased run select nothing, and lowercasing
only one side has the same effect. Letting a malformed expression yield a
matcher that answers false for everything, instead of refusing, makes the
malformed run report zero tests as a pass rather than a failure, which the
report script distinguishes. Raising an unmatched-step refusal for a scenario
the filter excluded makes the fourth child run fail. Registering a twice-skipped
scenario twice shows up as two tests of one name in that same run. Requiring the
tag expression library from src/tag-filter.js rather than taking the parse
function as an argument makes the architectural vector exit non-zero. Applying
the filter when tagFilter is undefined, or marking scenarios in a way that
changes registration order, makes the whole-repository vector and
assert-test-names.js exit non-zero. Bumping the tag expression pin to an
ESM-only major makes the contract vector fail at require time.

### Oracle and verification (Value 3: tagFilter selects scenarios through real tag expressions, and the excluded ones are reported skipped)

Oracle target locator:
`test/specs/features/step-definitions/v3-tag-filter.steps.js`
Oracle verification command index: `1`

Verification command:

```sh
npm ci
```

Verification command:

```sh
npx jest test/specs/features/step-definitions/v3-tag-filter.steps.js --coverage=false
```

Verification command:

```sh
npx jest --coverage=false
```

Verification command:

```sh
node test/specs/baseline/assert-tag-filter-report.js
```

Verification command:

```sh
node test/specs/baseline/assert-validation-report.js
```

Verification command:

```sh
node test/specs/baseline/assert-test-names.js
```

Verification command:

```sh
npx jest test/specs/arch/dependency-direction.steps.js --coverage=false
```

Verification command:

```sh
npx jest test/specs/contract/tag-expressions.steps.js --coverage=false
```

Verification command:

```sh
npm run test-d
```

## Value 4: scenarioNameTemplate names every test, Examples rows included, with each row's own substituted title

### Purpose (Value 4: scenarioNameTemplate names every test, Examples rows included, with each row's own substituted title)

Make scenarioNameTemplate reach every test Fusion registers, which on outline
rows it never did: the previous engine applied the template to the outline's
un-substituted title and then threw that result away in favour of the row's own
name. Each test is named by the template, given the feature's title and tags,
the scenario's own tags and the title of that particular row, and a template
that cannot produce a name is refused at collection instead of naming a test
something Jest cannot report.

### Constraints (Value 4: scenarioNameTemplate names every test, Examples rows included, with each row's own substituted title)

- The template receives exactly the four variables already declared at
  src/index.d.ts:54-60: featureTitle, featureTags, scenarioTitle and
  scenarioTags. No variable is added, because a consumer's existing template was
  written against that shape.
- scenarioTitle is the title of the individual test being named. For an Examples
  row that is the row's own substituted title, which is the whole point of this
  value; for a plain scenario it is the scenario's title.
- featureTags are the feature's declared tags and scenarioTags are the rest of
  the tags that reached the scenario, which is the pickle's unioned set with the
  feature's tags removed. Both carry the leading at sign and are lowercased,
  because that is what the previous engine passed.
- The template names every test whatever its status, including a test skipped
  because a tag filter excluded it or because its steps do not bind. A scenario
  whose reported name depended on whether it ran could not be compared across
  runs.
- A template that throws, or that returns anything other than a non-empty
  string, is refused at collection with WHAT, WHY and HOW, and the first line
  keeps the phrase An error occurred while executing a scenario name template so
  anything a consumer greps for still matches.
- When scenarioNameTemplate is undefined nothing about naming changes, so every
  existing suite and every name in the 2.0.0 baseline is untouched by this
  value.
- This value adds no public export and no new option key. scenarioNameTemplate
  is already declared at src/index.d.ts:89; only its documentation and its
  behaviour change. setFusionConfiguration stays absent until value 5.
- No value 1, 2 or 3 oracle or support file is edited. The architectural
  specification, the two contract specifications, the name baseline and its
  script, the validation report script and the tag filter report script are run
  as verification vectors and left byte-identical, so their recorded witnesses
  stay valid.
- The whole repository suite exits 0 at the end of this value. No expectation
  names a suite or test count.
- The names a template produces are observed through Jest's own JSON report on a
  real consumer file, and every check exits 0 only when the names it expects
  were actually reported.

### Targets (Value 4: scenarioNameTemplate names every test, Examples rows included, with each row's own substituted title)

| Path | Decision | Reason |
|---|---|---|
| `src/feature-source.js` | EXTEND | The template's variables are facts about the parsed feature, and this is the only module that holds it. loadFeature at src/feature-source.js:233 returns the feature's declared tags alongside its title, and each scenario it returns carries the tags that reached it, read off the same pickle tag list tagNamesOf already builds at :221 for the tag filter. The duplicate check, the tag filter marking and the registration order are untouched. |
| `src/scenario-name.js` | CREATE_NEW | A pure module owning one question: what is this test called. It assembles the four variables, calls the consumer's template, checks that what came back is a usable name, and builds the refusal when the template throws or answers with something else. It follows the shape every other piece of core here already has, src/keywords.js, src/step-argument.js, src/tag-filter.js and src/code-suggestion.js: one responsibility, no filesystem, no parser, no Jest global, so the refusal and the variable assembly can be read without a runner. It extends the module list the shared contract named by one, for that consistency. |
| `src/test-registration.js` | EXTEND | The only module that names a test, so it asks src/scenario-name.js for the name and passes that to test at src/test-registration.js:99-106 instead of the raw scenario title. Both routes take the same name, the running one and the skipping one, so a status change never renames a test. The binding pass, the refusal, the hook registration and the step runner are untouched. |
| `src/index.d.ts` | EXTEND | ScenarioNameTemplateVars at src/index.d.ts:54-60 and scenarioNameTemplate at :89 gain documentation of what this value settles: that the template names every test including each Examples row, that scenarioTitle is that row's own substituted title, that tags carry the leading at sign and are lowercased, that featureTags and scenarioTags are disjoint, and that a template which cannot produce a name is refused. No declared type changes, so test-d/index.test-d.ts keeps compiling unmodified. |

### Paradigm (Value 4: scenarioNameTemplate names every test, Examples rows included, with each row's own substituted title)

procedural

### Decisions (Value 4: scenarioNameTemplate names every test, Examples rows included, with each row's own substituted title)

- Why outline rows were never templated: the previous engine applied the
  template at feature-definition-creation.js:197 to the outline's un-substituted
  title, then at :209 defined each row with the row's own name, discarding the
  templated value. So the option was silently inert on every Examples row, and
  fixing that is ruling 7. It is the one accepted exception to byte-identical
  names, and only a consumer who passes a template and has outlines sees any
  difference.
- Tags carry the leading at sign, and that is a measured decision rather than a
  reading of the documentation. The previous engine built its tag lists from the
  AST tag names lowercased, and a Gherkin AST tag name includes the at sign, so
  a 2.0.0 template received the at sign. The example at
  docs/AdditionalConfiguration.md:105 claims an output without it, which makes
  that line wrong in the same way the same document is wrong about the errors
  keys. Behaviour follows what consumers' templates were actually written
  against; the document is corrected at value 5.
- Tags are lowercased, for the same reason: the previous engine lowercased every
  tag before a template ever saw it. Value 3 deliberately kept the original case
  in the carrier and lowercased only inside the comparison, so this value
  lowercases where the variables are assembled rather than changing what the
  port stores.
- scenarioTags is the pickle's unioned tag set with the feature's declared tags
  removed, which is what ruling 7 fixed. It reproduces both of the previous
  engine's lists from the one source this package has: the union already
  includes an Examples set's own tags, which is what an outline row's
  scenarioTags had to contain. Named residue: a tag written on BOTH the feature
  and a scenario appears only in featureTags, where the previous engine would
  have had it in both lists. The alternative is reading scenario and Examples
  tags separately off the AST, which is more code for a case a consumer has no
  reason to write, so the ruling's subtraction stands and the divergence is
  recorded rather than hidden.
- The template names skipped tests too. A tag-excluded or unwired scenario is
  registered under the same name it would have had if it ran, so a reader
  comparing two runs sees one test changing status rather than one test
  disappearing and another appearing. Both registration routes take the name
  from the same call.
- A template that throws is refused at collection, not swallowed and not allowed
  to name one test and not another. The previous engine wrapped the failure with
  the phrase An error occurred while executing a scenario name template, which
  this keeps as the first line so an existing grep still matches, and then adds
  the scenario it was naming, why a name is required before any test can be
  registered, and how to make the template total.
- A template that returns something other than a non-empty string is refused as
  well, and that check is new. The previous engine passed whatever came back
  straight to the runner, so a template returning undefined produced a test with
  no usable name and a template returning a number produced one that could not
  be selected by name. Refusing is the only answer that leaves the consumer able
  to act.
- The refusal and the variable assembly live in a new pure module rather than
  inside the registration port. Every other piece of core in this package is one
  pure module with one responsibility, and the three refusals that already exist
  are each owned by the module that can explain them. Putting a fifth
  responsibility inside src/test-registration.js, which cannot be read without a
  Jest runtime, would make this the one refusal that is hard to exercise.
- The template cannot affect which scenarios exist, only what they are called,
  so it runs after the tag filter and after the duplicate-title check. A
  template that maps two distinct declared titles onto one name produces two
  tests of one name, and that is recorded as the consumer's own choice rather
  than refused: the duplicate check is about the feature file, and refusing a
  template's output would make it impossible to deliberately group tests under
  one name.
- When scenarioNameTemplate is undefined the name is the scenario title and
  nothing calls the template path, so every existing suite and every name in
  test/specs/baseline/test-names-2.0.0.txt is unchanged. That script, owned by
  value 1, is run as a vector and is the falsifier for this claim.
- The two new fields on the value the port hands back are optional and read by
  presence, so a test double that fabricates a feature without them behaves
  exactly as it does today. That is why no existing test file is a target of
  this value: the staged features at m5-errors-false-silent-skip.steps.js:102
  and m3-singleton-reset.steps.js:110 carry no tags and must keep passing
  untouched, and the whole-repository vector is the falsifier.
- The oracle observes what the template was handed, which a step definition file
  can see, and the acceptance script observes the names Jest actually reported,
  which only a run report can show. A template that records its variables proves
  each row received its own substituted title; it cannot prove that the value it
  returned became the test's name.
- The fixtures the report script drives are named with a fixture extension so
  the repository runner, which selects every .steps.js file, does not collect
  them. The throwing-template and non-string-template fixtures in particular
  must fail collection, and collecting them would break the whole-repository
  vector.
- Verification starts with npm ci as its own vector, because des verify builds a
  clean temporary checkout with nothing installed.

### Reuse analysis (Value 4: scenarioNameTemplate names every test, Examples rows included, with each row's own substituted title)

| Symbol | Locator | Decision | Reason |
|---|---|---|---|
| loadFeature | `src/feature-source.js:233` | EXTEND | Already returns the feature title and every scenario with its own title, and already reads the pickle tag list for the filter. It gains the feature's declared tags and each scenario's tags, which are the only facts the template needs that the core cannot derive. |
| tagNamesOf | `src/feature-source.js:221` | REUSE | Already turns a pickle's tags into plain names for the filter, so the same call supplies the template's tag list. One reader of the pickle tag shape rather than two. |
| registerFeature | `src/test-registration.js:72` | EXTEND | The only module that names a test. It asks for the name once per scenario and uses it on both the running and the skipping route, so naming cannot drift between statuses. |
| boundScenarios | `src/test-registration.js:21` | EXTEND | Already carries the per-scenario facts registration needs, including the tag exclusion it copies at :32. It carries the scenario's tags through in the same way, so the registration loop has everything without reaching back to the port. |
| runScenario | `src/test-registration.js:54` | REUSE | The step runner and the failing-step decoration are untouched. A renamed test runs exactly the same body. |
| registerHooks | `src/test-registration.js:67` | REUSE | Hooks stay registered once per feature, and renaming tests does not change what they wrap. |
| mergeFusionOptions | `src/configuration.js:44` | REUSE | scenarioNameTemplate is already a default key at src/configuration.js:22-26 and already merges from the per-call options. This is the first value at which that key reaches a reader, and the merge needs no change. |
| tagFilterFor | `src/tag-filter.js:1` | REUSE | The filter decides which scenarios are excluded and the template decides what they are called. The two are independent, and an excluded scenario is named by the template like any other. |
| unmatchedStepRefusal | `src/code-suggestion.js:1` | REUSE | The precedent for where a refusal lives: owned by the pure module that can explain it, raised by the port. The new naming refusal follows it rather than inventing a second pattern. |
| processScenarioTitleTemplate | `node_modules/jest-cucumber/dist/src/feature-definition-creation.js:68` | REPLACE | The real previous owner of the template call, including the wrapping of a thrown error at :80. Reimplemented in src/scenario-name.js, with the defect that made it inert on outline rows removed: it was called with the outline's un-substituted title at :197 and its result discarded at :209. |
| parseTags | `node_modules/jest-cucumber/dist/src/parsed-feature-loading.js:72` | REPLACE | The real previous owner of the tag lists the template received, lowercased AST tag names including the leading at sign. That is the measured behaviour this value reproduces, from the pickle union rather than from a second AST walk. |

### Prefactoring (Value 4: scenarioNameTemplate names every test, Examples rows included, with each row's own substituted title)

Not applicable: No minimal preserving move is available. The delta is additive
behaviour plus one new pure module, and there is nothing in src/ to move into
it: no naming code exists anywhere, because the name is the scenario title
passed straight to the runner at src/test-registration.js:99-106. The two
existing functions that change, loadFeature and registerFeature, change by
gaining facts and a call, which is behaviour rather than movement, and no
existing green oracle could observe either as unchanged.

### Agreement analysis (Value 4: scenarioNameTemplate names every test, Examples rows included, with each row's own substituted title)

| Contract | Role | Locator | Decision | Reason |
|---|---|---|---|---|
| the LoadedFeature value handed back by src/feature-source.js | producer | `src/feature-source.js:233` | MIGRATED | The feature gains its declared tags and each scenario gains the tags that reached it. The existing fields, the titles, the steps and the tag exclusion flag, are unchanged. |
| the LoadedFeature value handed back by src/feature-source.js | consumer | `src/test-registration.js:21` | MIGRATED | The per-scenario pass carries the new tag facts through to the registration loop, the same way it already copies the tag exclusion flag. |
| the LoadedFeature value handed back by src/feature-source.js | consumer | `src/test-registration.js:99` | MIGRATED | The registration loop reads them to build the template variables, and names both the running and the skipping route from one call. |
| the LoadedFeature value handed back by src/feature-source.js | consumer | `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js:102` | UNCHANGED_COMPATIBLE | It fabricates a feature with no tags to isolate the unmatched-step handling. The new fields are optional and read by presence, and that file passes no template, so it is treated exactly as today and is left byte-identical. |
| the LoadedFeature value handed back by src/feature-source.js | consumer | `test/specs/features/step-definitions/m3-singleton-reset.steps.js:110` | UNCHANGED_COMPATIBLE | Its feature builder stages the same shape for the registry-reset regression and is likewise left byte-identical. |
| public TypeScript surface of the package | producer | `src/index.d.ts:54` | MIGRATED | ScenarioNameTemplateVars and scenarioNameTemplate stop describing an option that is inert on outline rows, so both gain documentation of the four variables, the leading at sign, the lowercasing and the refusal. No declared type changes. |
| public TypeScript surface of the package | consumer | `test-d/index.test-d.ts:2` | UNCHANGED_COMPATIBLE | It asserts the step verbs and the StepChain return type only, and no declared type changes here, so it must keep compiling unmodified. That is why npm run test-d stays a vector. |

### Impact closure (Value 4: scenarioNameTemplate names every test, Examples rows included, with each row's own substituted title)

- runtime: `src/feature-source.js`; CHANGED: Returns the feature's declared tags
  and each scenario's tags, read off the pickle tag list the filter already
  uses.
- runtime: `src/scenario-name.js`; CHANGED: New pure module assembling the four
  template variables, calling the template, checking its answer and owning the
  naming refusal.
- runtime: `src/test-registration.js`; CHANGED: Names every test from one call,
  on both the running and the skipping route, instead of passing the raw
  scenario title.
- public_interface: `src/index.d.ts`; CHANGED: ScenarioNameTemplateVars and
  scenarioNameTemplate gain documentation of the variables, the leading at sign,
  the lowercasing and the refusal. No declared type changes.
- consumer: `src/test-registration.js:21`; MIGRATED: Carries the new tag facts
  through to the registration loop.
- consumer: `src/test-registration.js:99`; MIGRATED: Reads them to build the
  template variables and names both registration routes from one call.
- consumer:
  `test/specs/features/step-definitions/m5-errors-false-silent-skip.steps.js:102`;
  UNCHANGED_COMPATIBLE: Its staged feature omits the new optional fields and
  passes no template, so it is treated exactly as today and left byte-identical,
  keeping its value 2 record valid.
- consumer:
  `test/specs/features/step-definitions/m3-singleton-reset.steps.js:110`;
  UNCHANGED_COMPATIBLE: Its feature builder omits them for the same reason and
  is likewise left byte-identical.
- consumer: `test-d/index.test-d.ts:2`; UNCHANGED_COMPATIBLE: No declared type
  changes, so it keeps compiling unmodified and npm run test-d keeps it honest.

### Architectural tests (Value 4: scenarioNameTemplate names every test, Examples rows included, with each row's own substituted title)

The following checks falsify the declared obligations using the linked native
verification command.

Obligation: src/scenario-name.js, the one module this value adds, requires
nothing from the cucumber scope, the filesystem or the caller stack, and names
no Jest global, so the naming refusal stays readable without a runner and the
registration port remains the only module that can register anything. The law
enumerates the src/ tree rather than a fixed module list, so it already covers
the new module and neither the law nor its specification file is edited here.

Test locator: `test/specs/arch/dependency-direction.steps.js`

Verification command index: `7`

Obligation: src/index.js still exports exactly the eight public names. This
value adds none, and the export list is the thing value 5 will change, so
observing it unchanged here separates the two.

Test locator: `test/specs/arch/dependency-direction.steps.js`

Verification command index: `7`

### Contract tests (Value 4: scenarioNameTemplate names every test, Examples rows included, with each row's own substituted title)

Not applicable: No party outside this deployable changes. The two cross-owner
contracts, the Gherkin pickle shape and the tag expression API, are bound and
specified at values 1 and 3 and are unchanged, and both are run as verification
vectors. The only parser facts this value newly reads, that a feature node
carries its declared tags and that a pickle's tag list is the union reaching
that scenario, are observed end to end through the public driving port by the
oracle, which records exactly what the template was handed for a plain scenario
and for each Examples row. A second lower-level check of the same fact would be
a competing authority rather than new evidence.

### Architecture decision record (Value 4: scenarioNameTemplate names every test, Examples rows included, with each row's own substituted title)

Not applicable: The architectural decision for this Request is recorded and
accepted in the shared section, at
docs/feature/drop-jest-cucumber/architecture/brief.md under the heading Shared
contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with
no jest-cucumber, and applying the template to outline rows is ruling 7 of
docs/feature/drop-jest-cucumber/plan.md. This value implements those decisions
rather than taking a new one.

### Boundaries (Value 4: scenarioNameTemplate names every test, Examples rows included, with each row's own substituted title)

- Driving port: The CommonJS module surface of src/index.js as required by a
  consumer .steps.js file collected by their own Jest: Given, When, Then, And,
  But, Before, After and Fusion, called synchronously at module load, with
  Jest's own run report as the observation surface for what every test is called
  and what status it has.
- Driven port: Feature file bytes, Gherkin parsing and pickle compilation,
  reached only from src/feature-source.js.
- Driven port: Tag expression parsing, reached only from src/feature-source.js,
  which injects the parse function.
- Driven port: The Jest globals describe, test, test.skip, beforeEach and
  afterEach, reached only from src/test-registration.js.
- Driven port: The consumer's own template function, called only from
  src/scenario-name.js, which treats it as untrusted: it may throw and it may
  answer with anything.
- Driven port: A child Jest process and its JSON report, reached only from the
  acceptance-owned script test/specs/baseline/assert-template-names.js and never
  from src/.
- Dependency direction: Unchanged and inward. src/index.js depends on
  src/configuration.js and on the two driven ports; src/test-registration.js
  depends on src/step-matching.js, src/code-suggestion.js and now
  src/scenario-name.js; src/scenario-name.js depends on nothing. No core module
  reaches the filesystem, a parser or a Jest global, and the two ports still do
  not depend on each other.
- Failure: Condition: The template throws when it is called for a scenario. |
  Outcome: Refusal | Observation: One refusal out of Fusion at collection,
  before any describe, whose first line reads An error occurred while executing
  a scenario name template, then which scenario it was naming, why a name is
  needed before any test can be registered, and how to make the template total.
  No test of that file runs.
- Failure: Condition: The template returns something other than a non-empty
  string. | Outcome: Refusal | Observation: The same refusal shape, naming what
  came back and that a test name has to be a non-empty string. The previous
  engine passed the value on and produced a test that could not be reported or
  selected by name.
- Failure: Condition: A scenario is excluded by a tag filter, or has a step that
  binds no definition while the step check is off, and a template is in force. |
  Outcome: Refusal | Observation: The test is registered as skipped under its
  templated name, the same name it would carry if it ran, so a status change
  never looks like one test disappearing and another appearing.
- Failure: Condition: A template maps two scenarios with different declared
  titles onto one name. | Outcome: Refusal | Observation: Accepted, and two
  tests of that name are reported. The duplicate check is about declared titles
  in the feature file; grouping tests under one name is a thing a template may
  deliberately do.
- Failure: Condition: scenarioNameTemplate is undefined. | Outcome: Refusal |
  Observation: The name is the scenario title and the template path is never
  entered, so every existing suite and every name in the 2.0.0 baseline is
  unchanged.
- Failure: Condition: A tag is declared on both the feature and a scenario while
  a template is in force. | Outcome: Indeterminate | Observation: It appears in
  featureTags only, because scenarioTags is the pickle union with the feature's
  tags removed. The previous engine would have had it in both lists. This is the
  named residue of ruling 7's subtraction and is recorded rather than refused.
- Failure: Condition: The acceptance report script cannot make its observation,
  because a child Jest process cannot be started or its JSON report cannot be
  read. | Outcome: Indeterminate | Observation:
  test/specs/baseline/assert-template-names.js prints which child run it could
  not make and exits non-zero, so the value is adjudicated rather than reported
  green. It never exits 0 on an observation it did not make.

### Acceptance supports (Value 4: scenarioNameTemplate names every test, Examples rows included, with each row's own substituted title)

- `test/specs/features/v4-scenario-name-template.feature`
- `test/specs/baseline/assert-template-names.js`
- `test/specs/fixtures/template-names.feature`
- `test/specs/fixtures/template-names.fixture.js`
- `test/specs/fixtures/template-with-tag-filter.fixture.js`
- `test/specs/fixtures/template-throws.fixture.js`
- `test/specs/fixtures/template-returns-non-string.fixture.js`

### Public oracle (Value 4: scenarioNameTemplate names every test, Examples rows included, with each row's own substituted title)

Observation: A consumer who passes a scenarioNameTemplate sees every test in the
run named by it, each Examples row included and each receiving its own
substituted title as scenarioTitle, alongside the feature's title, the feature's
tags and the scenario's own tags, with the leading at sign and lowercased. A
test skipped by a tag filter carries the same templated name it would carry if
it ran. A template that throws, or that answers with something other than a
non-empty string, is refused at collection rather than naming a test something
Jest cannot report.

Stimulus: From a clean checkout: npm ci, then npx jest on
test/specs/features/step-definitions/v4-scenario-name-template.steps.js, an
ordinary consumer step definition file that calls Fusion on
test/specs/features/v4-scenario-name-template.feature, a feature carrying a
feature-level tag, a tagged plain scenario, and a tagged Scenario Outline with
two Examples rows whose Examples set carries a tag of its own. Its template
records every set of variables it is handed and returns a name, and an afterAll
asserts on what was recorded; the file also captures the refusals from a
template that throws and one that returns a number. Then npx jest over the whole
repository. Then node test/specs/baseline/assert-template-names.js, which runs
jest in a child process once per fixture consumer file under test/specs/fixtures
with an explicit testMatch and reads the JSON report: the templated feature, the
templated feature with a tag filter, the throwing template and the non-string
template. Then the value 3, value 2 and value 1 report scripts unchanged, then
the architectural vector and the two contract vectors, then npm run test-d.

Expected: jest exits 0 for the oracle file: the template was called once per
registered test, three times for this feature; each call carried featureTitle
equal to the feature's name; featureTags carried the feature's tag with its
leading at sign, lowercased; the plain scenario's call carried its own tag in
scenarioTags and not the feature's; each outline row's call carried that row's
substituted title in scenarioTitle, different for the two rows, with the
outline's tag and the Examples set's tag in scenarioTags; and the two captured
refusals both open with the phrase An error occurred while executing a scenario
name template. The whole repository suite exits 0, with every existing name
unchanged because no existing suite passes a template. assert-template-names.js
prints one line per child run and exits 0: the templated run reports every test
under its templated name, including one per Examples row with that row's own
substituted title inside it; the templated run with a tag filter reports the
excluded scenario as skipped under its templated name; and both bad-template
runs fail with no test reported. The three earlier report scripts exit 0, the
architectural vector exits 0, both contract vectors exit 0 and npm run test-d
exits 0.

Falsifier: Applying the template to the outline's un-substituted title, or
applying it and then discarding the result for the row's own name as the
previous engine did, makes the oracle record two identical scenarioTitle values
and makes the report script find untemplated row names. Dropping the leading at
sign, or not lowercasing, makes the oracle's tag assertions fail. Putting the
feature's tags into scenarioTags, or omitting the Examples set's tags from it,
fails the same assertions. Naming a skipped test from the raw title while naming
a running one from the template makes the filtered child run report a name the
script does not expect. Letting a throwing template be swallowed, or a
non-string answer be passed to the runner, makes the two bad-template child runs
report tests instead of failing. Calling the template when none is given, or
changing the name of any existing test, makes the whole-repository vector and
the value 1 name baseline script exit non-zero. Reaching for the filesystem, a
parser or a Jest global from src/scenario-name.js, or adding a public export,
makes the architectural vector exit non-zero.

### Oracle and verification (Value 4: scenarioNameTemplate names every test, Examples rows included, with each row's own substituted title)

Oracle target locator:
`test/specs/features/step-definitions/v4-scenario-name-template.steps.js`
Oracle verification command index: `1`

Verification command:

```sh
npm ci
```

Verification command:

```sh
npx jest test/specs/features/step-definitions/v4-scenario-name-template.steps.js --coverage=false
```

Verification command:

```sh
npx jest --coverage=false
```

Verification command:

```sh
node test/specs/baseline/assert-template-names.js
```

Verification command:

```sh
node test/specs/baseline/assert-tag-filter-report.js
```

Verification command:

```sh
node test/specs/baseline/assert-validation-report.js
```

Verification command:

```sh
node test/specs/baseline/assert-test-names.js
```

Verification command:

```sh
npx jest test/specs/arch/dependency-direction.steps.js --coverage=false
```

Verification command:

```sh
npx jest test/specs/contract/gherkin-pickles.steps.js --coverage=false
```

Verification command:

```sh
npx jest test/specs/contract/tag-expressions.steps.js --coverage=false
```

Verification command:

```sh
npm run test-d
```

## Value 5: setFusionConfiguration sets options once from a Jest setup file, and a per-call option still wins

### Purpose (Value 5: setFusionConfiguration sets options once from a Jest setup file, and a per-call option still wins)

Replace the global configuration path that died with the removed intermediary. A
consumer lists one script in Jest's setupFiles, calls setFusionConfiguration
there, and every step definition file in that run gets those options without
repeating them, while a file that passes its own option still overrides the
global one for itself. This is also where the Request's documentation obligation
lands: the migration from the old setter, the errors keys the published
documentation has never described correctly, loadRelativePath as a no-op, and
the corrected tag example.

### Constraints (Value 5: setFusionConfiguration sets options once from a Jest setup file, and a per-call option still wins)

- The merge order is defaults, then the global set by setFusionConfiguration,
  then the per-call options, which is the order the removed intermediary used.
  The slot for the global layer was left empty in src/configuration.js at value
  1 and is filled here.
- errors keeps the key-wise merge value 2 built: whichever of the three forms a
  consumer writes, at either layer, the merged options carry a complete
  three-key object.
- A later setFusionConfiguration call replaces the global rather than merging
  into it, so a consumer can clear or redefine it. That matches the previous
  setter, which assigned its argument wholesale.
- setFusionConfiguration is a new public export, declared in src/index.d.ts and
  exported from src/index.js. It is the ninth public name, and it is the only
  export this Request adds.
- A non-object argument to setFusionConfiguration is refused where it is called,
  with WHAT, WHY and HOW. Unknown keys are accepted and ignored, exactly as
  unknown per-call keys already are.
- Jest gives each test file its own module registry and runs setupFiles inside
  it, so a global set in a setup script is visible to Fusion in that file and
  cannot leak into another file. The design depends on that and the oracle has
  to observe it through a real run rather than by calling the setter in the same
  file.
- The documentation obligation is part of this value, not a follow-up: README.md
  and docs/AdditionalConfiguration.md describe setFusionConfiguration and how to
  migrate from the previous setter, replace the four errors keys at
  docs/AdditionalConfiguration.md:21-28 that have never existed in the
  dependency this package used, state loadRelativePath as accepted and ignored,
  and correct the tag example at :105 to show the leading at sign that a
  template actually receives.
- No value 1 to 4 oracle or support file is edited, with one deliberate
  exception that is routed and costed below:
  test/specs/arch/dependency-direction.steps.js, whose export list pins exactly
  eight names and must admit the ninth.
- When setFusionConfiguration is never called, nothing changes: the global layer
  is empty and the merge is what value 2 left, so every existing suite and every
  name in the 2.0.0 baseline is untouched.
- The whole repository suite exits 0 at the end of this value. No expectation
  names a suite or test count.
- The setupFiles behaviour is observed through a real Jest run whose
  configuration lists a setup script, and every check exits 0 only when the
  scenarios it names actually ran or were skipped.

### Targets (Value 5: setFusionConfiguration sets options once from a Jest setup file, and a per-call option still wins)

| Path | Decision | Reason |
|---|---|---|
| `src/configuration.js` | EXTEND | The module that owns the merge, and whose comment at src/configuration.js:5-7 records that the global object and its setter were deliberately left out with the slot kept for them. It gains the module-level global, the setter that replaces it, the shape check, and the second layer in mergeFusionOptions at :44 between the defaults at :22 and the per-call options. |
| `src/index.js` | EXTEND | Re-exports the setter in the exports block at src/index.js:136-143, so a consumer requires it from this package rather than from the removed intermediary. One line; the registry, the verbs, the hooks and Fusion itself are untouched. |
| `src/index.d.ts` | EXTEND | Declares setFusionConfiguration over the existing FusionOptions type at src/index.d.ts:62, and documents the merge order, the replace-on-second-call semantics and where the setter is meant to be called. It is the ninth declared export; no existing type changes, so test-d/index.test-d.ts keeps compiling unmodified. |
| `docs/AdditionalConfiguration.md` | EXTEND | The Request's documentation obligation. The global configuration section at :125 is rewritten for setFusionConfiguration with migration guidance from the previous setter; the errors section at :21-28 loses the four keys that never existed in the dependency this package used and gains the three that do, with what each now governs; the loadRelativePath section at :114 states that it is accepted and ignored; and the tag example at :105 is corrected to show the leading at sign, which is what value 4 measured a template actually receives. |
| `README.md` | EXTEND | The entry point a consumer reads first, and the place the breaking change has to be visible. It gains the setupFiles plus setFusionConfiguration path alongside the per-call options, and a short migration note for the import that moved, next to the configuration link at README.md:156. |

### Paradigm (Value 5: setFusionConfiguration sets options once from a Jest setup file, and a per-call option still wins)

procedural

### Decisions (Value 5: setFusionConfiguration sets options once from a Jest setup file, and a per-call option still wins)

- A later setFusionConfiguration call replaces the global rather than merging
  into it. The previous setter assigned its argument wholesale, which the
  architecture pass recorded while that dependency was still installed; it has
  since been removed, so the citation is to that recorded reading rather than to
  a file in the tree now, and that provenance is stated rather than implied.
  Replace is also the only semantics under which a consumer can clear a global
  they set earlier, which merging makes impossible.
- The global is validated the way per-call options are and no more strictly.
  errors in any of its three forms normalises through the same path value 2
  built, and an unknown key is accepted and ignored, because a per-call unknown
  key already is and two different strictnesses for the same option object would
  be a trap. What is refused is a non-object argument, at the point of the call,
  because that is a mistake the consumer can only have made once and can fix
  immediately.
- Module-registry isolation is what makes this safe rather than global state.
  Jest builds a fresh module registry per test file and runs setupFiles inside
  it, so the setter writes a variable that only that file's Fusion calls can
  see, and one file cannot change another file's configuration. That is also why
  the oracle has to drive a real Jest run with a configuration listing a setup
  script: calling the setter in the same file would prove only that a
  module-level variable can be written.
- The export-list conflict is routed, not avoided, and its cost is named. The
  architectural law bound at value 1 asserts the public surface is exactly eight
  names, with the list at test/specs/arch/dependency-direction.steps.js:67-76
  and the assertion at :268, and this value adds a ninth. That file is a value 1
  acceptance support, so making it a craft target would have craft rewriting
  bytes a recorded oracle witness covers. It is therefore declared as an
  acceptance support of THIS value and revised by the acceptance designer, with
  exactly one change: the ninth name joins the list and its comment says why.
  Everything else in that file stays byte-identical, which is what keeps value
  1's re-record to the minimum. The cost is accepted explicitly: value 1's
  oracle record over that file no longer matches and has to be re-recorded.
- Two alternatives were considered and rejected. Restating the law so it reads
  the export list from the type declarations would avoid pinning a count, but
  changing that statement is itself an edit of the same file, so it buys
  nothing. Avoiding the ninth export is not available: the setter is ruling 5
  and a global configuration path with no public entry point is not a
  configuration path.
- The setter lives in src/configuration.js and is only re-exported from
  src/index.js, so the module that owns the merge owns the layer the setter
  writes. Putting the variable in the entry point would split one decision
  across two modules and give the entry point state of its own.
- The documentation is a target of this value rather than a follow-up because
  the Request names it, and because three of the four corrections are only true
  once this value lands: the import a consumer must change, the errors keys as
  values 2 and 3 made them, and the tag example as value 4 measured it. Shipping
  the code without them would leave a consumer reading instructions for a
  package that no longer exists.
- When the setter is never called the global layer is absent and the merge is
  byte-for-byte what value 2 left, so no existing suite and no name in the 2.0.0
  baseline moves. The value 1 name script, run unchanged as a vector, is the
  falsifier for that.
- The oracle is a step definition file that spawns child Jest runs with a
  configuration listing a setup script, and reads their JSON reports. That keeps
  the oracle a file the repository runner selects while still observing the one
  thing that matters here, that a global set in setupFiles reaches Fusion in a
  different file. A separate baseline script would add a file without adding an
  observation, so this value has no report script of its own.
- The fixture project lives under a fixtures directory with its own Jest
  configuration files, and nothing in it is named with the extension the
  repository runner selects, so none of it is collected by the ordinary run. The
  invalid-global setup script in particular must make its run fail.
- Verification starts with npm ci as its own vector, because des verify builds a
  clean temporary checkout with nothing installed. Every earlier value's report
  script and both contract specifications are run unchanged, so the last value
  in the Request is also the point at which the whole set is observed together.

### Reuse analysis (Value 5: setFusionConfiguration sets options once from a Jest setup file, and a per-call option still wins)

| Symbol | Locator | Decision | Reason |
|---|---|---|---|
| mergeFusionOptions | `src/configuration.js:44` | EXTEND | The owner of the merge, already assembling the defaults and the per-call options. It gains the middle layer, which is the whole of this value's runtime behaviour. |
| defaultOptions | `src/configuration.js:22` | REUSE | The bottom layer is unchanged. A global that names one option still leaves the other defaults in place, because the layers are merged rather than swapped. |
| normaliseErrors | `src/configuration.js:37` | REUSE | The key-wise expansion value 2 built already handles all three forms of errors, so it serves the global layer with no change and both layers normalise identically. |
| Fusion | `src/index.js:107` | REUSE | It already calls the merge and passes the result to both ports, so it needs no knowledge that a second layer exists. Nothing in it changes. |
| loadFeature | `src/feature-source.js:233` | REUSE | It reads the merged options and cannot tell which layer a key came from, which is the point of merging before the ports are called. Untouched. |
| registerFeature | `src/test-registration.js:72` | REUSE | Likewise reads the merged options only. Untouched. |
| FusionOptions | `src/index.d.ts:62` | REUSE | The setter takes the same option type a per-call consumer already writes, so no new type is introduced and a consumer who knows one knows the other. |
| PUBLIC_EXPORTS | `test/specs/arch/dependency-direction.steps.js:67` | EXTEND | The list the architectural law compares the real export set against. It admits the ninth name, which is the only change this value makes to that file, revised by the acceptance designer rather than by craft because it is a recorded support. |
| setJestCucumberConfiguration | `docs/AdditionalConfiguration.md:147` | REPLACE | The previous global setter, still named in the published documentation as the way to configure this package, and the import a consumer has to change. The documentation locator is the honest one: the implementation it referred to left the tree when the dependency did. |
| getJestCucumberConfiguration | `docs/AdditionalConfiguration.md:127` | REPLACE | The documented precedence rule, that settings in step definition files take precedence over global configuration, which this value implements as the middle layer of the merge. Same provenance: the code is gone and the documentation is what remains to correct. |

### Prefactoring (Value 5: setFusionConfiguration sets options once from a Jest setup file, and a per-call option still wins)

Not applicable: No minimal preserving move is available. The runtime delta is
one variable, one setter and one extra layer in a merge that was explicitly
built with the slot for it at src/configuration.js:5-7, so there is nothing to
relocate. The documentation targets are prose, and the one change to an existing
test file, the export list at
test/specs/arch/dependency-direction.steps.js:67-76, is a revision of an
acceptance support rather than a move of production code.

### Agreement analysis (Value 5: setFusionConfiguration sets options once from a Jest setup file, and a per-call option still wins)

| Contract | Role | Locator | Decision | Reason |
|---|---|---|---|---|
| public module surface of the package | producer | `src/index.js:136` | MIGRATED | The exports block gains setFusionConfiguration, taking the public surface from eight names to nine. It is the only export this Request adds, and the import a consumer previously made from the removed intermediary now comes from here. |
| public module surface of the package | consumer | `test/specs/arch/dependency-direction.steps.js:67` | MIGRATED | The architectural law compares the real export set against this list, which pins exactly eight names. It admits the ninth, revised by the acceptance designer because this file carries a recorded oracle witness from value 1; that record no longer matches afterwards and has to be re-recorded, which is the accepted cost of the only export this Request adds. |
| public module surface of the package | consumer | `test-d/index.test-d.ts:2` | UNCHANGED_COMPATIBLE | It imports and asserts the step verbs and the StepChain return type. An added export changes nothing it names, so it must keep compiling unmodified and is left byte-identical. |
| merged Fusion options handed to the driven ports | producer | `src/configuration.js:44` | MIGRATED | A second layer is merged between the defaults and the per-call options. The shape handed on is unchanged, including the complete three-key errors object, so neither port can tell which layer a key came from. |
| merged Fusion options handed to the driven ports | consumer | `src/feature-source.js:233` | UNCHANGED_COMPATIBLE | It reads the merged options for the duplicate check and the tag filter and needs no knowledge of the new layer, so it is not edited. |
| merged Fusion options handed to the driven ports | consumer | `src/test-registration.js:72` | UNCHANGED_COMPATIBLE | It reads the merged options for the errors decision and the template and likewise needs no change. |
| documented configuration surface of the package | producer | `docs/AdditionalConfiguration.md:125` | MIGRATED | The global configuration section describes a setter imported from a package this one no longer depends on. It is rewritten for setFusionConfiguration with migration guidance, and in the same pass the errors keys, the loadRelativePath note and the tag example are corrected. |
| documented configuration surface of the package | consumer | `README.md:156` | MIGRATED | The entry point that links to the configuration document and is where a consumer looks first. It gains the setup-file path and the migration note, so the breaking import change is visible without opening the linked document. |

### Impact closure (Value 5: setFusionConfiguration sets options once from a Jest setup file, and a per-call option still wins)

- runtime: `src/configuration.js`; CHANGED: Gains the module-level global, the
  replacing setter, the shape check and the middle layer of the merge.
- public_interface: `src/index.js`; CHANGED: Re-exports setFusionConfiguration,
  taking the public surface to nine names. Nothing else in the module changes.
- public_interface: `src/index.d.ts`; CHANGED: Declares setFusionConfiguration
  over the existing FusionOptions type and documents the merge order and the
  replace-on-second-call semantics. No existing type changes.
- manifest: `docs/AdditionalConfiguration.md`; CHANGED: The global configuration
  section is rewritten for the new setter with migration guidance; the errors
  keys, the loadRelativePath note and the tag example are corrected.
- manifest: `README.md`; CHANGED: Gains the setup-file configuration path and
  the migration note for the import that moved.
- test: `test/specs/arch/dependency-direction.steps.js:67`; MIGRATED:
  Acceptance-designer revision: the export list admits the ninth name and its
  comment says why. The only change to that file; value 1's record over it is
  re-recorded, which is the accepted cost.
- test: `test-d/index.test-d.ts:2`; UNCHANGED_COMPATIBLE: An added export
  changes nothing it asserts, so it keeps compiling unmodified and npm run
  test-d keeps it honest.
- consumer: `src/feature-source.js:233`; UNCHANGED_COMPATIBLE: Reads the merged
  options and cannot tell a global key from a per-call one, so it is not edited.
- consumer: `src/test-registration.js:72`; UNCHANGED_COMPATIBLE: Reads the
  merged options for the same reason and is likewise not edited.
- consumer: `README.md:156`; MIGRATED: The configuration link and its
  surroundings carry the new path and the migration note.

### Architectural tests (Value 5: setFusionConfiguration sets options once from a Jest setup file, and a per-call option still wins)

The following checks falsify the declared obligations using the linked native
verification command.

Obligation: src/index.js exports exactly the nine public names: the five step
verbs, the two hooks, Fusion and setFusionConfiguration. Nothing else leaks, so
the two internal ports and the pure core stay internal and the dropped runner
option is still not reintroduced under any name.

Test locator: `test/specs/arch/dependency-direction.steps.js`

Verification command index: `9`

Obligation: src/configuration.js, which now holds the global, still requires
nothing from the cucumber scope, the filesystem or the caller stack and names no
Jest global, so the configuration layer stays pure and the setter cannot read
ambient state.

Test locator: `test/specs/arch/dependency-direction.steps.js`

Verification command index: `9`

### Contract tests (Value 5: setFusionConfiguration sets options once from a Jest setup file, and a per-call option still wins)

Not applicable: No party outside this deployable changes and no dependency is
added. The two cross-owner contracts, the Gherkin pickle shape and the tag
expression API, are bound and specified at values 1 and 3, are unchanged here,
and are both run as verification vectors. The one external mechanism this value
depends on, that Jest runs setupFiles inside the same module registry as the
test file, is Jest's own and is observed directly by the oracle through real
child runs with a configuration that lists a setup script, which is stronger
evidence than a separate specification of the same fact.

### Architecture decision record (Value 5: setFusionConfiguration sets options once from a Jest setup file, and a per-call option still wins)

Not applicable: The architectural decision for this Request is recorded and
accepted in the shared section, at
docs/feature/drop-jest-cucumber/architecture/brief.md under the heading Shared
contract: Fusion owns the test lifecycle on a pinned CommonJS Gherkin line, with
no jest-cucumber, and the new setter with its merge order is ruling 5 of
docs/feature/drop-jest-cucumber/plan.md. This value implements those decisions
rather than taking a new one.

### Boundaries (Value 5: setFusionConfiguration sets options once from a Jest setup file, and a per-call option still wins)

- Driving port: The CommonJS module surface of src/index.js as required by a
  consumer, from two places now: a .steps.js file collected by their Jest, and a
  script listed in their setupFiles, which requires setFusionConfiguration and
  calls it before any step definition file loads. Jest's own run report is the
  observation surface for which scenarios ran.
- Driven port: Feature file bytes, Gherkin parsing and pickle compilation,
  reached only from src/feature-source.js.
- Driven port: Tag expression parsing, reached only from src/feature-source.js.
- Driven port: The Jest globals, reached only from src/test-registration.js.
- Driven port: The consumer's own template function, called only from
  src/scenario-name.js.
- Driven port: A child Jest process with its own configuration and setup script,
  and its JSON report, reached only from the oracle and never from src/.
- Dependency direction: Unchanged and inward. The setup script and the step
  definition file both depend on src/index.js; src/index.js depends on
  src/configuration.js and on the two driven ports; src/configuration.js depends
  on nothing and now holds the global. No core module reaches the filesystem, a
  parser or a Jest global, and the two ports still do not depend on each other.
- Failure: Condition: setFusionConfiguration is called with something that is
  not an object. | Outcome: Refusal | Observation: It refuses where it was
  called, in the setup script, naming what it received, why the global has to be
  an option object, and the option keys it accepts. The run fails before any
  step definition file loads, which is where a consumer can act on it.
- Failure: Condition: The global names an option and the step definition file
  names the same option. | Outcome: Refusal | Observation: The per-call value
  wins for that file only, and every other file in the run still sees the
  global. That is the precedence the documentation has always stated.
- Failure: Condition: setFusionConfiguration is called a second time. | Outcome:
  Refusal | Observation: The second argument replaces the first global entirely,
  so a key named only in the first call is gone. That is what lets a consumer
  clear a global, and it is the previous setter's behaviour.
- Failure: Condition: The global sets errors in one of its three forms. |
  Outcome: Refusal | Observation: It normalises through the same path a per-call
  errors takes, so both ports receive a complete three-key object and neither
  can tell which layer wrote it.
- Failure: Condition: The global carries a key Fusion does not know. | Outcome:
  Refusal | Observation: Accepted and ignored, exactly as an unknown per-call
  key already is. Two different strictnesses for one option object would be a
  trap rather than a safeguard.
- Failure: Condition: setFusionConfiguration is never called. | Outcome: Refusal
  | Observation: The global layer is absent and the merge is what value 2 left,
  so every existing suite and every name in the 2.0.0 baseline is unchanged.
- Failure: Condition: A consumer expects a global set in one test file to affect
  another. | Outcome: Indeterminate | Observation: It does not, and cannot: Jest
  gives each test file its own module registry, so the global is per file.
  setupFiles is the supported way to reach every file, and the documentation
  says so rather than leaving a consumer to discover it.
- Failure: Condition: The oracle cannot make its observation, because a child
  Jest process cannot be started or its JSON report cannot be read. | Outcome:
  Indeterminate | Observation: The oracle fails naming which child run it could
  not make, so the value is adjudicated rather than reported green. It never
  passes on an observation it did not make.

### Acceptance supports (Value 5: setFusionConfiguration sets options once from a Jest setup file, and a per-call option still wins)

- `test/specs/arch/dependency-direction.steps.js`
- `test/specs/fixtures/global-config/jest.global.json`
- `test/specs/fixtures/global-config/jest.invalid.json`
- `test/specs/fixtures/global-config/setup-fusion.js`
- `test/specs/fixtures/global-config/setup-invalid.js`
- `test/specs/fixtures/global-config/tagged.feature`
- `test/specs/fixtures/global-config/global-only.fixture.js`
- `test/specs/fixtures/global-config/per-call-override.fixture.js`

### Public oracle (Value 5: setFusionConfiguration sets options once from a Jest setup file, and a per-call option still wins)

Observation: A consumer who lists one script in Jest's setupFiles and calls
setFusionConfiguration there, importing it from this package, gets those options
in every step definition file of the run without repeating them: a global
tagFilter of one included tag runs only the scenarios carrying it and reports
the others as skipped. A step definition file that passes its own tagFilter
overrides the global one for itself while the rest of the run keeps the global.
Calling the setter with something that is not an option object fails the run
where it was called.

Stimulus: From a clean checkout: npm ci, then npx jest on
test/specs/features/step-definitions/v5-global-configuration.steps.js, a step
definition file that spawns child Jest runs over the fixture project under
test/specs/fixtures/global-config and reads their JSON reports. The valid
configuration lists test/specs/fixtures/global-config/setup-fusion.js in
setupFiles, which requires setFusionConfiguration from this package and sets a
tagFilter of the included tag; that run collects two consumer files, one passing
no options to Fusion and one passing its own tagFilter. A second configuration
lists a setup script that calls the setter with a string. Then npx jest over the
whole repository, then every earlier value's report script unchanged, then the
architectural vector and both contract vectors, then npm run test-d.

Expected: jest exits 0 for the oracle file. In the valid child run, the file
that passes no options reports the included scenario passed and the excluded one
skipped under its own name, which is the global taking effect through setupFiles
in a file that never mentions it; the file that passes its own tagFilter reports
the selection its own expression makes and not the global's, and the first
file's result is unaffected by it. The invalid child run fails, with the refusal
naming what was passed to the setter and no test reported. The whole repository
suite exits 0, with every existing suite and name unchanged because nothing in
it calls the setter. The value 4, 3, 2 and 1 report scripts exit 0; the
architectural vector exits 0 with the public surface now exactly nine names;
both contract vectors exit 0; npm run test-d exits 0 against the declared
setter.

Falsifier: Not exporting the setter, or exporting it under another name, makes
the setup script fail to require it and makes the architectural vector exit
non-zero. Reading the global at the wrong layer, so that a per-call option loses
to it, makes the overriding file in the valid child run report the global's
selection instead of its own. Letting the override leak, so that one file's
per-call option changes another file's selection, makes the first file's report
wrong in the same run. Merging a second setter call into the first instead of
replacing it leaves a cleared key in force, which the oracle sets up and checks.
Accepting a non-object argument makes the invalid child run report tests instead
of failing. Applying a global when none was set, or changing any existing test
name, makes the whole-repository vector and the value 1 name baseline script
exit non-zero. Leaving the export list at eight names makes the architectural
vector exit non-zero, and leaving the documented setter or the four non-existent
errors keys in place leaves the Request's documentation obligation unmet, which
the reviewer reads against docs/AdditionalConfiguration.md and README.md.

### Oracle and verification (Value 5: setFusionConfiguration sets options once from a Jest setup file, and a per-call option still wins)

Oracle target locator:
`test/specs/features/step-definitions/v5-global-configuration.steps.js`
Oracle verification command index: `1`

Verification command:

```sh
npm ci
```

Verification command:

```sh
npx jest test/specs/features/step-definitions/v5-global-configuration.steps.js --coverage=false
```

Verification command:

```sh
npx jest --coverage=false
```

Verification command:

```sh
node test/specs/baseline/assert-template-names.js
```

Verification command:

```sh
node test/specs/baseline/assert-tag-filter-report.js
```

Verification command:

```sh
node test/specs/baseline/assert-validation-report.js
```

Verification command:

```sh
node test/specs/baseline/assert-test-names.js
```

Verification command:

```sh
npx jest test/specs/contract/gherkin-pickles.steps.js --coverage=false
```

Verification command:

```sh
npx jest test/specs/contract/tag-expressions.steps.js --coverage=false
```

Verification command:

```sh
npx jest test/specs/arch/dependency-direction.steps.js --coverage=false
```

Verification command:

```sh
npm run test-d
```
