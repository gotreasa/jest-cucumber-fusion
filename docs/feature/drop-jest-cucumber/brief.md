# Product brief

## Request
    Replace the runtime dependency on jest-cucumber in @g_package/jest-cucumber-fusion with jest plus @cucumber/gherkin, keeping the same Fusion() options shape, and release the result as 3.0.0. jest-cucumber is dormant (last release 4.5.0 on 2024-07-25) and is the only route to the runtime-scope uuid advisory GHSA-w5hq-g745-h8pq (Dependabot alert #1) that consumers of this package see; it cannot be fixed upstream. Fusion therefore takes over the whole test lifecycle it delegates today: reading and parsing the feature file, expanding outlines, building the Jest describe and test blocks, running steps in order, decorating failures, tag filtering, scenario name templates, option validation and starter-code generation. The dependencies are pinned to the last CommonJS-loadable cucumber line (@cucumber/gherkin 39.1, @cucumber/messages 32.3, @cucumber/tag-expressions 9.1) because Jest 30 on Node 22 cannot require() the ESM-only newer majors. The work also closes L5, the empty docstring inside a scenario outline that jest-cucumber drops before Fusion is ever called.

## Outcomes
-     A consumer who installs @g_package/jest-cucumber-fusion 3.0.0 has no dependency path to uuid, so the runtime-scope advisory GHSA-w5hq-g745-h8pq (Dependabot alert #1) no longer reaches them through this package.
-     A consumer who upgrades from 2.0.0 keeps their existing feature files and .steps.js files working, with jest describe and test names unchanged, so their CI reports and test history stay comparable across the major.
-     A consumer whose feature step has no matching definition gets a loud failure carrying starter code they can paste in Fusion's own idiom, and never a test that passes silently or runs with no captures.
-     A consumer who turns validation off with errors: false sees the affected scenario reported by Jest as skipped, so switching validation off never hides a scenario that is not being tested.
-     A consumer whose Examples row supplies an empty docstring gets that empty string delivered to their step function instead of losing the argument.
-     A consumer's documented options (tagFilter, errors, scenarioNameTemplate, loadRelativePath) behave as the documentation states, and the documentation no longer describes keys that do not exist.
-     A consumer who repeats the same options in every step definition file can set them once from a Jest setupFiles script through setFusionConfiguration, without importing anything from jest-cucumber.
-     A consumer who uses scenarioNameTemplate sees it applied to scenario outline rows as well, where it is silently ignored today.
-     A consumer no longer depends, through this package, on an intermediary that has had no release since 2024-07-25 and cannot be fixed upstream.

## Scope

### In scope
-     Fusion() builds directly on jest plus @cucumber/gherkin: read the feature file, parse it, compile pickles, register describe and test blocks, run steps sequentially, decorate failures, run Before/After hooks once per test.
-     Pin @cucumber/gherkin to 39.1, @cucumber/messages to 32.3 and @cucumber/tag-expressions to 9.1, the last CommonJS-loadable line, and remove jest-cucumber from dependencies.
-     Implement tagFilter in Fusion, with filtered scenarios reported as skipped tests and tags matched case-insensitively.
-     Implement errors as a boolean or as the object scenariosMustMatchFeatureFile / stepsMustMatchFeatureFile / allowScenariosNotInFeatureFile, with the semantics ruled on 2026-10-07.
-     Implement scenarioNameTemplate for every test, outline rows included.
-     Accept loadRelativePath as a typed no-op and document it as such; remove runner from the public types.
-     Add the public export setFusionConfiguration(options) with merge order defaults < global < per-call.
-     Delete the 155-line outline matching heuristic; outline steps match their substituted text.
-     Drop jest-cucumber's pending() source sniff without adding any pending verb.
-     Keep the failing-step error text and the missing-feature-file message as they are today.
-     Close L5: an empty docstring inside a scenario outline row reaches the step function.
-     Recover the Gherkin keyword per step (given / when / then / and / but) so keyword-scoped step shadowing keeps working, including non-English dialects.
-     Update README.md and docs/AdditionalConfiguration.md for the corrected errors keys, the new global configuration path and loadRelativePath being a no-op.
-     Release as 3.0.0, breaking, with release notes covering the deleted outline heuristic, the dropped pending() sniff, the moved global configuration import and the scenarioNameTemplate change on outline rows.

### Out of scope
Applicability: applicable
Reason:     Gearoid ruled each of these outside this release on 2026-10-07; they are recorded so they are not silently pulled in.
-     A richer failing-step failure message carrying the feature file and line number; planned as a later 3.1 feature.
-     Moving Fusion to ESM, dual-publishing it, or raising the supported baseline to Node 24.9+.
-     Making jest a peerDependency instead of a runtime dependency (risk R10, flagged only).
-     Adding a pending() or Pending() verb to the public surface.
-     Tracking the cucumber majors that have moved past the pinned CommonJS line.
-     Quint formal exploration of the step lifecycle.

## Jobs to be done

### Human
- [confirmed] When Dependabot flags a runtime-scope advisory in a package I publish and the upstream dependency carrying it is dormant and cannot be fixed, I want to remove that dependency, so I can ship an install my consumers can audit clean.

### LLM
- [proposed] When I upgrade a test library across a major version, I want my existing test names and reports to stay the same, so I can tell a real regression from a renaming.
- [proposed] When a step in my feature file has no matching definition, I want a loud failure with code I can paste, so I can finish the binding instead of shipping a test that passes without testing anything.
- [proposed] When I read the configuration documentation for a test library, I want the options it lists to be the options that exist, so I can configure the suite without reading the library's source.
- [proposed] When every step definition file in my project needs the same options, I want to set them once, so my step files hold only steps.

## User journey

_Not explored._

Journey arc: UNKNOWN (journey not explored)

## Gherkin scenarios

### Installing the package brings no uuid advisory (proposed)
```gherkin
Given a clean consumer project running jest 30 on node 22
When the consumer installs jest-cucumber-fusion 3.0.0
Then npm ls jest-cucumber reports no matching package
And npm ls uuid reports no matching package
```

### Existing suites keep their test names across the major (proposed)
```gherkin
Given a feature file and step definition file that pass on 2.0.0
When the consumer upgrades to 3.0.0 and runs npx jest
Then every describe and test name is byte-identical to the 2.0.0 run
And every test still passes
```

### An empty docstring inside an outline row reaches the step (proposed)
```gherkin
Given a scenario outline whose Examples row supplies an empty docstring value
When npx jest runs that row
Then the step function receives the row value and the empty string
```

### A failing step still reports the step text and its arguments (proposed)
```gherkin
Given a step definition whose assertion fails
When npx jest runs that scenario
Then the failure names the failing step, lists the step arguments, and carries the original error message, byte-identical to 2.0.0
```

### An unbound step fails loudly with Fusion starter code (proposed)
```gherkin
Given a feature step that no Given, When, Then, And or But definition binds
When npx jest runs that scenario
Then the test fails with a Fusion-owned unmatched-step message
And the message carries starter code of the form Given("...", () => {})
```

### Turning validation off skips the scenario visibly (proposed)
```gherkin
Given a feature step that no step definition binds
And Fusion is called with errors set to false
When npx jest runs the file
Then Jest reports that scenario as a skipped test
And Jest does not report it as passed
```

### Duplicate scenario titles are rejected by default (proposed)
```gherkin
Given a feature file with two scenarios carrying the same title
When npx jest runs the file
Then the run reports the duplicate scenario title
And setting scenariosMustMatchFeatureFile to false accepts the same file
```

### A tag filter runs one scenario and skips the other by name (proposed)
```gherkin
Given a feature with one @included scenario and one @excluded scenario
When Fusion is called with tagFilter set to @included and not @excluded
Then npx jest reports one passed test and one skipped test
And the skipped test is listed under the excluded scenario's name
```

### A name template shapes outline row names too (proposed)
```gherkin
Given a scenario outline with two Examples rows and a scenarioNameTemplate
When npx jest runs the file
Then each row's test name is the template applied to that row's own substituted title
```

### An outline row whose value does not fit the definition reports an unmatched step (proposed)
```gherkin
Given a step definition whose regex does not match one Examples row's substituted text
When npx jest runs that row
Then that row's test fails as an unmatched step
And it does not run the definition with no captures
```

### Global configuration from a Jest setup file applies to every step file (proposed)
```gherkin
Given a setupFiles script that calls setFusionConfiguration with tagFilter @included
And a step definition file that passes no options to Fusion
When npx jest runs
Then only the @included scenario runs
And a tagFilter passed to Fusion in a step file wins over the global one
```

### A missing feature file names the path it looked for (proposed)
```gherkin
Given Fusion is called with a feature file name that does not exist
When npx jest loads the step definition file
Then the failure reads Feature file not found with the absolute path
```

## Quint scenarios

_Not run: no Quint model was executed for this brief._

## Observations
-     In a clean consumer project running jest 30 on node 22 that installs this package from npm pack, npm ls jest-cucumber and npm ls uuid both report no matching package, and npx jest runs the repository's existing feature suites green with every jest describe and test name byte-identical to the 2.0.0 run, including a scenario outline row whose step receives an empty docstring as the empty string, and a failing step whose message is byte-identical to 2.0.0.
-     With a feature step that no step definition binds, npx jest fails that test with a Fusion-owned unmatched-step message containing starter code in Fusion's idiom such as Given("...", () => {}); with errors: false or errors: { stepsMustMatchFeatureFile: false } the same scenario is reported by Jest as a skipped test and never as a passing one; and a feature file holding two scenarios of the same title is rejected by default while scenariosMustMatchFeatureFile: false accepts it.
-     With Fusion called as Fusion('tagged-scenarios.feature', { tagFilter: '@included and not @excluded' }) on a feature holding one @included and one @excluded scenario, npx jest reports one passed test and one skipped test, the skipped one listed under the excluded scenario's own name, and the same filter matches tags written in a different case.
-     With a scenarioNameTemplate passed to Fusion, every test name in the run is produced by that template, scenario outline rows included, each row receiving its own <vars>-substituted title in vars.scenarioTitle alongside featureTitle, featureTags and scenarioTags.
-     With setFusionConfiguration({ tagFilter: '@included' }) called from a script listed in Jest's setupFiles and no options passed to Fusion, npx jest runs only the @included scenario, and a tagFilter passed to Fusion in one step definition file overrides the global one for that file only.

## Decisions
-     Confirmed (Gearoid, 2026-10-07): Fusion implements tagFilter, errors (boolean, or the object of scenariosMustMatchFeatureFile / stepsMustMatchFeatureFile / allowScenariosNotInFeatureFile) and scenarioNameTemplate itself; loadRelativePath stays accepted as a typed no-op; runner is removed from the public types.
-     Confirmed (Gearoid, 2026-10-07): jest describe and test names stay byte-identical to 2.0.0 - describe is the feature title, one test per scenario, one test per outline Examples row with <vars> substituted into the title - with the single exception recorded for scenarioNameTemplate below.
-     Confirmed (Gearoid, 2026-10-07): the release is 3.0.0, a breaking major.
-     Confirmed (Gearoid, 2026-10-07): dependencies are pinned to the last CommonJS-loadable line, @cucumber/gherkin 39.1, @cucumber/messages 32.3 and @cucumber/tag-expressions 9.1, because Jest 30 on Node 22 cannot require() the ESM-only newer majors; this was measured, not assumed.
-     Confirmed (Gearoid, 2026-10-07): global options move to a new public export setFusionConfiguration(options), replacing jest-cucumber's setJestCucumberConfiguration, with merge order defaults < global < per-call. Breaking: the import moves to this package.
-     Confirmed (Gearoid, 2026-10-07): an unmatched step raises one Fusion-owned error, always loud, carrying starter code in Fusion's own idiom - Given("...", () => {}), or a regex with captures when the step text holds numbers or quoted strings.
-     Confirmed (Gearoid, 2026-10-07): errors: false or stepsMustMatchFeatureFile: false turns the affected scenario into a visible skipped test, never a silent pass.
-     Confirmed (Gearoid, 2026-10-07): scenariosMustMatchFeatureFile gates rejection of duplicate scenario titles; allowScenariosNotInFeatureFile is accepted but vestigial; the stale errors documentation in docs/AdditionalConfiguration.md, which lists four keys that do not exist in jest-cucumber 4.5.0, is corrected.
-     Confirmed (Gearoid, 2026-10-07): scenarioNameTemplate applies to every test, outline rows included, each row using its own expanded title; today it is silently ignored on outline rows. This is the one accepted exception to byte-identical names, and only template users with outlines see it.
-     Confirmed (Gearoid, 2026-10-07): the outline matching heuristic is deleted and outline steps match their substituted text, so a row whose value does not fit a definition's regex now reports an unmatched step instead of running with no captures. Release note required.
-     Confirmed (Gearoid, 2026-10-07): jest-cucumber's pending() source sniff, which silently skips a scenario whose step source text contains pending(), is dropped, and no pending verb is added. A previously skipped scenario will now run. Release note required.
-     Confirmed (Gearoid, 2026-10-07): the failing-step error text stays byte-identical - Failing step: "<text>", then Step arguments: <JSON>, then Error: <message>. A richer message is a later release and is out of scope here.
-     Confirmed (Gearoid, 2026-10-07): a missing feature file keeps the message Feature file not found (<absolute path>).
-     Confirmed (Gearoid, 2026-10-07): taken as recommended with no objection - the Gherkin keyword is recovered per step through astNodeIds and the Gherkin dialects, step arguments keep today's shape (table to row objects, docstring to string, forwarded on presence so "" and [] survive), tag expressions are wrapped to stay case-insensitive, src/feature-source and src/test-registration are the internal test seam that replaces mocking jest-cucumber, and the implementation stays procedural.
-     Open: whether the missing-feature-file message also appends the resolved base directory. Ruling 11 allows it as a HOW but does not require it, so the exact text of that failure is not yet fixed.
-     Open: whether a scenario that is skipped - by tagFilter, or by errors: false - carries any annotation in its Jest test name. Byte-identical names say no; a reader scanning Jest output cannot otherwise tell a filtered scenario from an unbound one, so an annotation would need a further named exception.
-     Open: whether rejecting duplicate scenario titles fails the whole step definition file at collection time, so no test in it runs, or fails only the duplicated scenarios at run time. The consumer sees a very different report in each case.
-     Open: whether any step definition in this repository, or in a consumer project, binds only through the deleted outline heuristic (risk R4). The existing suite is the falsifier at the first value; the sharpest cases named by the architecture pass are test/specs/features/scenario-outlines.feature lines 35-76 and using-dynamic-values.feature lines 15-34.
-     Open: whether the migration from setJestCucumberConfiguration is carried by a README section alone or by a separate migration note shipped with the 3.0.0 release notes.

## Values
| Observation | Dependencies |
| --- | --- |
| In a clean consumer project running jest 30 on node 22 that installs this package from npm pack, npm ls jest-cucumber and npm ls uuid both report no matching package, and npx jest runs the repository's existing feature suites green with every jest describe and test name byte-identical to the 2.0.0 run, including a scenario outline row whose step receives an empty docstring as the empty string, and a failing step whose message is byte-identical to 2.0.0. |  |
| With a feature step that no step definition binds, npx jest fails that test with a Fusion-owned unmatched-step message containing starter code in Fusion's idiom such as Given("...", () => {}); with errors: false or errors: { stepsMustMatchFeatureFile: false } the same scenario is reported by Jest as a skipped test and never as a passing one; and a feature file holding two scenarios of the same title is rejected by default while scenariosMustMatchFeatureFile: false accepts it. | In a clean consumer project running jest 30 on node 22 that installs this package from npm pack, npm ls jest-cucumber and npm ls uuid both report no matching package, and npx jest runs the repository's existing feature suites green with every jest describe and test name byte-identical to the 2.0.0 run, including a scenario outline row whose step receives an empty docstring as the empty string, and a failing step whose message is byte-identical to 2.0.0. |
| With Fusion called as Fusion('tagged-scenarios.feature', { tagFilter: '@included and not @excluded' }) on a feature holding one @included and one @excluded scenario, npx jest reports one passed test and one skipped test, the skipped one listed under the excluded scenario's own name, and the same filter matches tags written in a different case. | In a clean consumer project running jest 30 on node 22 that installs this package from npm pack, npm ls jest-cucumber and npm ls uuid both report no matching package, and npx jest runs the repository's existing feature suites green with every jest describe and test name byte-identical to the 2.0.0 run, including a scenario outline row whose step receives an empty docstring as the empty string, and a failing step whose message is byte-identical to 2.0.0. |
| With a scenarioNameTemplate passed to Fusion, every test name in the run is produced by that template, scenario outline rows included, each row receiving its own <vars>-substituted title in vars.scenarioTitle alongside featureTitle, featureTags and scenarioTags. | In a clean consumer project running jest 30 on node 22 that installs this package from npm pack, npm ls jest-cucumber and npm ls uuid both report no matching package, and npx jest runs the repository's existing feature suites green with every jest describe and test name byte-identical to the 2.0.0 run, including a scenario outline row whose step receives an empty docstring as the empty string, and a failing step whose message is byte-identical to 2.0.0. |
| With setFusionConfiguration({ tagFilter: '@included' }) called from a script listed in Jest's setupFiles and no options passed to Fusion, npx jest runs only the @included scenario, and a tagFilter passed to Fusion in one step definition file overrides the global one for that file only. | In a clean consumer project running jest 30 on node 22 that installs this package from npm pack, npm ls jest-cucumber and npm ls uuid both report no matching package, and npx jest runs the repository's existing feature suites green with every jest describe and test name byte-identical to the 2.0.0 run, including a scenario outline row whose step receives an empty docstring as the empty string, and a failing step whose message is byte-identical to 2.0.0., With Fusion called as Fusion('tagged-scenarios.feature', { tagFilter: '@included and not @excluded' }) on a feature holding one @included and one @excluded scenario, npx jest reports one passed test and one skipped test, the skipped one listed under the excluded scenario's own name, and the same filter matches tags written in a different case. |
