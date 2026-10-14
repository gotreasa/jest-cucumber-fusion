// The release SBOM: scripts/write-sbom.js, which semantic-release runs in its prepare step
// (package.json, "release"; docs/feature/release-sbom/plan.md).
//
// It writes the SBOM only when npm produced one. A shell pipe into jq, its first form, exited 0
// when `npm sbom` failed, leaving an empty file to be uploaded and attested (PR review of the
// release SBOM, finding 1, 2026-10-14).
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
);

// A copy of the package's manifest, lockfile and scripts, in a directory whose name is not the
// package's: npm sbom names the root component after the directory.
function copyOfThePackage(changeManifest = (manifest) => manifest) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-sbom-"));
  fs.writeFileSync(
    path.join(project, "package.json"),
    JSON.stringify(changeManifest(structuredClone(packageJson))),
  );
  fs.copyFileSync(
    path.join(repositoryRoot, "package-lock.json"),
    path.join(project, "package-lock.json"),
  );
  fs.cpSync(
    path.join(repositoryRoot, "scripts"),
    path.join(project, "scripts"),
    { recursive: true },
  );
  return project;
}

function writeSbom(project) {
  return spawnSync("node", ["scripts/write-sbom.js", "release/out.cdx.json"], {
    cwd: project,
    encoding: "utf8",
  });
}

test("writes a CycloneDX SBOM of the runtime dependencies, named for the package", () => {
  const project = copyOfThePackage();
  try {
    const run = writeSbom(project);
    expect(run.status).toBe(0);

    const sbom = JSON.parse(
      fs.readFileSync(path.join(project, "release/out.cdx.json"), "utf8"),
    );
    const [group, name] = packageJson.name.split("/");
    expect({
      bomFormat: sbom.bomFormat,
      root: {
        group: sbom.metadata.component.group,
        name: sbom.metadata.component.name,
        version: sbom.metadata.component.version,
      },
      components: sbom.components.map((component) => component.name).sort(),
    }).toEqual({
      bomFormat: "CycloneDX",
      root: { group, name, version: packageJson.version },
      components: Object.keys(packageJson.dependencies).sort(),
    });
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test("fails, and writes nothing, when npm cannot produce the SBOM", () => {
  // A runtime dependency the lockfile does not have: npm sbom refuses it (ESBOMPROBLEMS).
  const project = copyOfThePackage((manifest) => ({
    ...manifest,
    dependencies: { ...manifest.dependencies, "left-pad": "1.3.0" },
  }));
  try {
    const run = writeSbom(project);

    expect({
      failed: run.status !== 0,
      written: fs.existsSync(path.join(project, "release/out.cdx.json")),
      reason: run.stderr,
    }).toEqual({
      failed: true,
      written: false,
      reason: expect.stringContaining("ESBOMPROBLEMS"),
    });
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});
