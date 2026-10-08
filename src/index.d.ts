// Type definitions for @g_package/jest-cucumber-fusion
// Project: https://github.com/gotreasa/jest-cucumber-fusion#readme
// Originally written by Pelle Johnsen <https://github.com/pjoe> for DefinitelyTyped.

export type CallBack = (
  ...args: ReadonlyArray<string | Array<Record<string, string>>>
) => void | Promise<void>;

export interface StepChain {
  stepSentence: string | RegExp;
  stepFnDefinition: CallBack;
}

export function Given(name: string | RegExp, callback: CallBack): StepChain;
export function Given(chain: StepChain): StepChain;
export function When(name: string | RegExp, callback: CallBack): StepChain;
export function When(chain: StepChain): StepChain;
export function Then(name: string | RegExp, callback: CallBack): StepChain;
export function Then(chain: StepChain): StepChain;
export function And(name: string | RegExp, callback: CallBack): StepChain;
export function And(chain: StepChain): StepChain;
export function But(name: string | RegExp, callback: CallBack): StepChain;
export function But(chain: StepChain): StepChain;

export function Before(callback: () => void | Promise<void>): void;
export function After(callback: () => void | Promise<void>): void;

/**
 * Which of Fusion's validations are on.
 *
 * - `stepsMustMatchFeatureFile` (default on): a feature step that no registered definition
 *   matches is refused at collection, in one message naming every unbound step of the feature
 *   with starter code for each. Off, the scenarios holding those steps are registered through
 *   `test.skip`, so Jest reports them as skipped and never as passed.
 * - `scenariosMustMatchFeatureFile` (default on): two scenarios of one feature file declared
 *   with the same title, ignoring case and counting a scenario inside a Rule, are refused at
 *   collection. A Scenario Outline counts once however many Examples rows it has, so repeated
 *   row names are never a duplicate. Off, the file is accepted as written.
 * - `allowScenariosNotInFeatureFile`: accepted and vestigial. Fusion generates the scenario
 *   definitions from the feature file itself, so there is no scenario outside it to allow.
 *
 * As a boolean, `errors` is shorthand: `true` turns every key on, `false` turns every key off.
 * As an object it merges KEY-WISE over the defaults, so naming one key says nothing about the
 * others. Switching the step check off leaves the duplicate check exactly as it was.
 */
export interface FusionErrorOptions {
  stepsMustMatchFeatureFile?: boolean;
  scenariosMustMatchFeatureFile?: boolean;
  allowScenariosNotInFeatureFile?: boolean;
}

/**
 * What a scenarioNameTemplate is handed, once per test. Unchanged from the shape consumers
 * already write: these four variables and no others.
 *
 * `scenarioTitle` is the title of the individual test being named. For a Scenario Outline row
 * that is the row's OWN substituted title, so each row gets its own name.
 *
 * `featureTags` are the feature's declared tags. `scenarioTags` are the rest of the tags that
 * reached the scenario, which for an Examples row includes that Examples set's tags. The two
 * lists are disjoint, and every tag carries its leading `@` and is lowercased. A tag declared
 * on both the feature and the scenario appears in `featureTags` only.
 */
export interface ScenarioNameTemplateVars {
  featureTitle: string;
  scenarioTitle: string;
  scenarioTags: string[];
  featureTags: string[];
}

export interface FusionOptions {
  /**
   * Accepted and ignored. Fusion always resolves a relative feature path against the
   * directory of the file that called it, and hands an absolute path on from there, so there
   * is nothing left for this to switch.
   */
  loadRelativePath?: boolean;
  errors?: boolean | FusionErrorOptions;
  /**
   * Which scenarios to run, as a tag expression: a tag name written `@name`, combined with
   * the operators `and`, `or` and `not` and grouped with parentheses. For example
   * `@smoke and not @slow`, or `@shop and (@included or @draft)`.
   *
   * Matching ignores case on both sides: the expression and every tag are lowercased before
   * they are compared, so the operators may be written in any case too.
   *
   * A scenario is selected on the tags its compiled pickle carries, which is the union of the
   * scenario's own tags, its feature's tags and, for a Scenario Outline row, that Examples
   * set's tags. A scenario the expression excludes is registered through `test.skip` under its
   * own unannotated name, so Jest reports it as skipped: never run, and never absent from the
   * report. Its steps are also exempt from the unmatched-step check, because a scenario you
   * excluded is not one you are asking to have wired.
   *
   * An expression that cannot be parsed is refused at collection, before anything is
   * registered, and the refusal names the expression you wrote.
   */
  tagFilter?: string;
  /**
   * Renames every test Fusion registers, Scenario Outline rows included. It is called once per
   * test while Fusion registers, never again while the tests run, and it names a test whatever
   * its status: a scenario skipped because a tag filter excluded it, or because its steps do
   * not bind, carries the same templated name it would have carried had it run.
   *
   * It must return a non-empty string. A template that throws, or that answers with anything
   * else, is refused at collection rather than naming a test something Jest cannot report.
   */
  scenarioNameTemplate?: (vars: ScenarioNameTemplateVars) => string;
}

export function Fusion(feature: string, options?: FusionOptions): void;

/**
 * Sets options for every `Fusion()` call in the current test file, so they need not be repeated
 * in each one. Meant for a script listed in Jest's `setupFiles`:
 *
 * ```js
 * // jest.config.js      ->  setupFiles: ["<rootDir>/jest.setup.js"]
 * // jest.setup.js
 * const { setFusionConfiguration } = require("@g_package/jest-cucumber-fusion");
 * setFusionConfiguration({ tagFilter: "@smoke and not @slow" });
 * ```
 *
 * Options are merged lowest to highest: the defaults, then whatever this setter holds, then the
 * options passed to one `Fusion()` call. A per-call option therefore still wins for its own
 * file, and `errors` merges key-wise at every layer, so naming one validation never switches
 * off another.
 *
 * A second call REPLACES what the first set rather than merging into it, which is what lets a
 * global be cleared or redefined. Jest gives each test file its own module registry and runs
 * `setupFiles` inside it, so what is set here cannot reach another file.
 *
 * An argument that is not an options object is refused where it is called, before any step
 * definition file has loaded. An unknown key is accepted and ignored, exactly as it is per call.
 */
export function setFusionConfiguration(options: FusionOptions): void;
