// A missing feature file is refused with the absolute path Fusion looked for, and the advice that
// follows must be true. Found by running the docs on 2026-10-09: for a feature path with a
// directory part, the message named the FEATURE's directory as "the directory of the file that
// called it", so a caller in .../p/q/r was told Fusion had resolved against .../p/q.
const path = require("path");

const { Fusion } = require("../../../../src");

let refusal = null;
try {
  Fusion("no-such-folder/missing.feature");
} catch (error) {
  refusal = error;
}

describe("missing feature file message", () => {
  test("names the absolute path Fusion looked for", () => {
    expect(refusal).not.toBeNull();
    expect(refusal.message).toContain(
      `Feature file not found (${path.join(
        __dirname,
        "no-such-folder",
        "missing.feature",
      )})`,
    );
  });

  test("never presents the feature's own folder as the calling file's directory", () => {
    expect(refusal.message).not.toContain(
      `which here is ${path.join(__dirname, "no-such-folder")}`,
    );
  });

  test("says what a relative path is resolved against", () => {
    expect(refusal.message).toContain(
      "relative to the directory of the file that calls Fusion",
    );
  });
});
