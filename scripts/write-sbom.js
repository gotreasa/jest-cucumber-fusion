// Writes the release's SBOM: a CycloneDX document of the runtime dependencies, which are the ones
// that ship (the CommonJS build bundles them, see scripts/build-cjs.js). semantic-release runs it
// in its prepare step, after @semantic-release/npm has written the version, and attaches the file
// to the GitHub release (package.json, "release"; docs/feature/release-sbom/plan.md).
//
//   node scripts/write-sbom.js <output file>
//
// npm sbom names the root component after the directory it runs in, not the package, while its
// purl is right; the name is set from package.json, split into CycloneDX's group and name.
//
// Nothing is written unless npm produced an SBOM. A shell pipe into jq, its first form, exited 0
// when npm sbom failed and left an empty file to be uploaded and attested (PR review of the
// release SBOM, finding 1, 2026-10-14; test/specs/packaging/release-sbom.steps.js).
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const output = process.argv[2];
if (!output) {
  console.error("Usage: node scripts/write-sbom.js <output file>");
  process.exit(2);
}

const npm = spawnSync(
  "npm",
  [
    "sbom",
    "--sbom-format",
    "cyclonedx",
    "--omit",
    "dev",
    "--package-lock-only",
  ],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);
if (npm.error) throw npm.error;
if (npm.status !== 0) process.exit(npm.status ?? 1);

const sbom = JSON.parse(npm.stdout);
const packageName = JSON.parse(fs.readFileSync("package.json", "utf8")).name;
const [group, name] = packageName.includes("/")
  ? packageName.split("/")
  : [undefined, packageName];
sbom.metadata.component.group = group;
sbom.metadata.component.name = name;

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(sbom, null, 2)}\n`);
