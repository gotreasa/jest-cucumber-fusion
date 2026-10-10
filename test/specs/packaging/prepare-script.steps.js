// The prepare script writes nothing to stdout, inside a git checkout or outside one.
//
// npm runs `prepare` during `npm pack`, and `npm pack --json` prints its JSON on stdout. Outside
// a git checkout (a source archive, for one) husky printed ".git can't be found" there, so the
// JSON could not be parsed. Found by smoke-testing a `git archive` of PR #16, review round 4
// (F6), 2026-10-10.
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");

// A consumer installing the package from a directory or a `file:` dependency runs `prepare`
// too, with none of this package's devDependencies, husky included. There are no hooks to
// install there, so the script does nothing, quietly (fresh fuzz of PR #16, 2026-10-10, B4).
test("npm run prepare succeeds quietly where husky is not installed", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-prepare-"));
  try {
    fs.copyFileSync(
      path.join(repositoryRoot, "package.json"),
      path.join(project, "package.json"),
    );
    fs.cpSync(
      path.join(repositoryRoot, "scripts"),
      path.join(project, "scripts"),
      { recursive: true },
    );

    const run = spawnSync("npm", ["run", "--silent", "prepare"], {
      cwd: project,
      encoding: "utf8",
    });

    expect({ exit: run.status, stdout: run.stdout }).toEqual({
      exit: 0,
      stdout: "",
    });
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test("npm run prepare prints nothing on stdout outside a git checkout", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-prepare-"));
  try {
    fs.copyFileSync(
      path.join(repositoryRoot, "package.json"),
      path.join(project, "package.json"),
    );
    fs.cpSync(
      path.join(repositoryRoot, "scripts"),
      path.join(project, "scripts"),
      {
        recursive: true,
      },
    );
    fs.symlinkSync(
      path.join(repositoryRoot, "node_modules"),
      path.join(project, "node_modules"),
      "dir",
    );

    const run = spawnSync("npm", ["run", "--silent", "prepare"], {
      cwd: project,
      encoding: "utf8",
    });

    expect({ exit: run.status, stdout: run.stdout }).toEqual({
      exit: 0,
      stdout: "",
    });
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});
