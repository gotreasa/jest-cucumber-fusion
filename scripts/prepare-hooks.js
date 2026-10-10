// The prepare script: installs the git hooks, exactly as `husky` does, but writes husky's
// message to stderr instead of stdout.
//
// npm runs `prepare` during `npm pack`, and `npm pack --json` prints its JSON on stdout. husky's
// own command writes its message to stdout, so outside a git checkout (a source archive, for
// one) ".git can't be found" broke that JSON (finding F6 of PR #16 review round 4;
// test/specs/packaging/prepare-script.steps.js). husky returns the message from its function,
// so it is still shown, on stderr, and the exit code stays 0 as husky's own command keeps it.
//
// npm also runs `prepare` when a consumer installs this package from a directory or a `file:`
// dependency. That install has none of this package's devDependencies, husky included, and no
// hooks to install, so a missing husky is skipped quietly. Any other failure still fails. This
// file ships in the package for that reason (fresh fuzz of PR #16, 2026-10-10, finding B4).
let husky;
try {
  ({ default: husky } = await import("husky"));
} catch (failure) {
  if (failure && failure.code === "ERR_MODULE_NOT_FOUND") process.exit(0);
  throw failure;
}

const message = husky();
if (message) console.error(`husky: ${message}`);
