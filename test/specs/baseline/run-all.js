// Runs every baseline assertion script (assert-*.js in this directory) in its own process and
// fails if any of them fails. These scripts compare 3.0.0 against the recorded 2.0.0 behaviour
// (test names, template names, reports, the packaged consumer, the advisory dependency). They
// are plain node scripts rather than Jest files, so `npm test` does not pick them up; this is
// how CI and the pre-push hook run them.
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const scripts = fs
  .readdirSync(import.meta.dirname)
  .filter((name) => /^assert-.*\.js$/.test(name))
  .sort();

const failed = scripts.filter((name) => {
  console.log(`baseline: ${name}`);
  const run = spawnSync(
    process.execPath,
    [path.join(import.meta.dirname, name)],
    {
      stdio: "inherit",
    },
  );
  return run.status !== 0;
});

if (failed.length > 0) {
  console.error(
    `\n${failed.length} baseline script(s) failed: ${failed.join(", ")}`,
  );
  process.exit(1);
}
console.log(`\nAll ${scripts.length} baseline scripts passed.`);
