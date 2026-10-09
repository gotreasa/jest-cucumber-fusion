// ESLint's recommended rules for all JavaScript, plus the Jest plugin's for the tests. Prettier
// owns formatting, so nothing here is about layout.
const js = require("@eslint/js");
const globals = require("globals");
const jestPlugin = require("eslint-plugin-jest");

const JEST_GLOBALS = [
  "describe",
  "test",
  "it",
  "expect",
  "beforeEach",
  "afterEach",
  "beforeAll",
  "afterAll",
  "jest",
];
const ONLY_REGISTRATION_MAY =
  "Only src/test-registration.js may touch a Jest global; pass it a value instead.";
const restrictedJestGlobals = JEST_GLOBALS.map((name) => ({
  name,
  message: ONLY_REGISTRATION_MAY,
}));

module.exports = [
  {
    ignores: ["coverage/", ".nwave/", ".claude/", "node_modules/"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
  {
    // Only src/test-registration.js may touch a Jest global, so registration order lives in one
    // module (docs/Architecture.md, section 5, rule 2). A bare name is refused with a message
    // here; reaching one through globalThis or global would get past no-undef, so that is
    // refused too. Scope-aware: a local `const it` or a key `test:` is not the global.
    // Pinned by test/specs/arch/dependency-direction.steps.js.
    files: ["src/**/*.js"],
    ignores: ["src/test-registration.js"],
    rules: {
      "no-restricted-globals": ["error", ...restrictedJestGlobals],
      "no-restricted-properties": [
        "error",
        ...["globalThis", "global"].flatMap((object) =>
          JEST_GLOBALS.map((property) => ({
            object,
            property,
            message: ONLY_REGISTRATION_MAY,
          })),
        ),
      ],
    },
  },
  {
    // Fusion registers each scenario through the runner's own globals, by design.
    files: ["src/test-registration.js"],
    languageOptions: {
      globals: {
        describe: "readonly",
        test: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
  },
  {
    files: ["test/**/*.js"],
    ...jestPlugin.configs["flat/recommended"],
    settings: { jest: { version: 30 } },
    rules: {
      ...jestPlugin.configs["flat/recommended"].rules,
      "jest/no-standalone-expect": [
        "error",
        {
          // Each step definition runs inside the test Fusion generates for its scenario, so an
          // expect there is inside a test. Two allowances, decided 2026-10-09: an expect inside
          // a jest.fn fake runs when the code under test calls it, during a test; and an
          // afterAll check asserts what a whole file's scenarios did.
          additionalTestBlockFunctions: [
            "Given",
            "When",
            "Then",
            "And",
            "But",
            "jest.fn",
            "afterAll",
          ],
        },
      ],
      // A test may assert through a named helper such as expectPastedSnippetToWork.
      "jest/expect-expect": ["error", { assertFunctionNames: ["expect*"] }],
      // A step function receives its captures by position, so an example may name an
      // argument only to reach the one after it.
      "no-unused-vars": ["error", { args: "none" }],
    },
  },
];
