// The prepare script: installs the git hooks, exactly as `husky` does, but writes husky's
// message to stderr instead of stdout.
//
// npm runs `prepare` during `npm pack`, and `npm pack --json` prints its JSON on stdout. husky's
// own command writes its message to stdout, so outside a git checkout (a source archive, for
// one) ".git can't be found" broke that JSON (finding F6 of PR #16 review round 4;
// test/specs/packaging/prepare-script.steps.js). husky returns the message from its function,
// so it is still shown, on stderr, and the exit code stays 0 as husky's own command keeps it.
import husky from "husky";

const message = husky();
if (message) console.error(`husky: ${message}`);
