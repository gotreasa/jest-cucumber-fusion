// Writes the release's SBOM: a CycloneDX document of the runtime dependencies, which are the ones
// that ship (the CommonJS build bundles them, see scripts/build-cjs.js). semantic-release runs it
// in its prepare step, after @semantic-release/npm has written the version, and attaches the file
// to the GitHub release (package.json, "release"; docs/feature/release-sbom/plan.md).
//
//   node scripts/write-sbom.js <output file>
//   node scripts/write-sbom.js --notes <attached SBOM file name>
//
// With --notes it prints the same dependencies as a Markdown table instead, which semantic-release
// appends to the GitHub release notes in its generateNotes step: the release page renders that,
// while the attached JSON is a download. generateNotes runs before prepare, so the table comes
// from its own npm sbom run, over the same lockfile.
//
// npm sbom names the root component after the directory it runs in, not the package, while its
// purl is right; the name is set from package.json, split into CycloneDX's group and name.
//
// Nothing is written or printed unless npm produced an SBOM. A shell pipe into jq, its first
// form, exited 0 when npm sbom failed and left an empty file to be uploaded and attested (PR
// review of the release SBOM, finding 1, 2026-10-14; test/specs/packaging/release-sbom.steps.js).
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const usage =
  "Usage: node scripts/write-sbom.js <output file>\n" +
  "       node scripts/write-sbom.js --notes <attached SBOM file name>";
const notes = process.argv[2] === "--notes";
const target = notes ? process.argv[3] : process.argv[2];
if (!target) {
  console.error(usage);
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

if (notes) {
  process.stdout.write(releaseNotes(sbom, target));
} else {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(sbom, null, 2)}\n`);
}

function releaseNotes(sbom, attachedFile) {
  const rows = [...sbom.components]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (component) =>
        `| \`${component.name}\` | ${component.version} | ${licence(component)} |`,
    );
  return [
    "### Runtime dependencies",
    "",
    "What this release ships. The CommonJS build (`require`) bundles them; an ES module",
    "consumer installs them as ordinary dependencies. The full SBOM, with hashes and the",
    `dependency tree, is attached as \`${attachedFile}\`.`,
    "",
    "| Package | Version | Licence |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

// CycloneDX holds a licence as an SPDX id, a free-text name, or an SPDX expression. Several
// entries do not say whether they are alternatives or all apply, so they are only listed.
function licence(component) {
  const licences = (component.licenses ?? []).map(
    (entry) => entry.expression ?? entry.license?.id ?? entry.license?.name,
  );
  return licences.filter(Boolean).join(", ") || "not stated";
}
