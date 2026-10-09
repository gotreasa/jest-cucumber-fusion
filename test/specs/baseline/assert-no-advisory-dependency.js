#!/usr/bin/env node
/**
 * Nothing a consumer installs reaches jest-cucumber, and nothing reaches uuid.
 *
 * uuid is the carrier of GHSA-w5hq-g745-h8pq, the runtime-scope advisory consumers of this
 * package see, and jest-cucumber is the only route to it. This is the observation the whole
 * Request exists for, so it is a command rather than prose: it reads the real installed
 * PRODUCTION tree (dev dependencies excluded, the same scope the advisory is reported in) and
 * exits 0 only when neither package appears anywhere in it.
 *
 * A tree it cannot read is never a pass. Every way of failing to make the observation --
 * npm missing, output that is not JSON, a package recorded as missing or invalid -- prints
 * what went wrong and exits non-zero, because "I could not look" and "I looked and it is
 * clean" must never produce the same exit status.
 */

const path = require("path");
const { spawnSync } = require("child_process");

const FORBIDDEN = ["jest-cucumber", "uuid"];

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
const manifest = require(path.join(repositoryRoot, "package.json"));

const cannotObserve = (what, why, how) => {
  console.error("CANNOT OBSERVE the production dependency tree.");
  console.error(`  WHAT: ${what}`);
  console.error(`  WHY:  ${why}`);
  console.error(`  HOW:  ${how}`);
  process.exit(2);
};

const readProductionTree = () => {
  const listing = spawnSync(
    "npm",
    ["ls", "--omit=dev", "--all", "--json", "--long=false"],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (listing.error) {
    cannotObserve(
      `npm could not be run: ${listing.error.message}`,
      "the installed tree is the only honest source for what a consumer would get",
      "run this where npm is on PATH",
    );
  }

  if (!listing.stdout || listing.stdout.trim() === "") {
    cannotObserve(
      "npm printed nothing",
      "an empty answer is not evidence that the tree is clean",
      `install the dependencies (npm ci) and try again; npm said:\n${(
        listing.stderr || ""
      ).trim()}`,
    );
  }

  try {
    return JSON.parse(listing.stdout);
  } catch (unreadable) {
    return cannotObserve(
      `npm did not print JSON: ${unreadable.message}`,
      "an unparseable listing cannot be searched, so it proves nothing either way",
      `run \`npm ls --omit=dev --all --json\` by hand and look at what it printed`,
    );
  }
};

// Every package in the tree, with the path by which it is reached, so a hit can be reported
// as a route rather than as a bare name.
const walk = (node, trail, found, broken) => {
  Object.entries(node.dependencies || {}).forEach(([name, child]) => {
    const route = [...trail, `${name}@${child.version || "?"}`];

    if (child.missing || child.invalid) {
      broken.push(
        `${route.join(" > ")} (${child.missing ? "missing" : "invalid"})`,
      );
    }
    if (FORBIDDEN.includes(name)) {
      found.push(route.join(" > "));
    }

    walk(child, route, found, broken);
  });
};

// --- main ----------------------------------------------------------------------------------

const tree = readProductionTree();

const declared = Object.keys(manifest.dependencies || {});
if (declared.length > 0 && !tree.dependencies) {
  cannotObserve(
    `package.json declares ${declared.length} production dependencies but the listing holds none`,
    "an uninstalled tree looks exactly like a clean one, and it is not the same claim",
    "run npm ci first, then run this again",
  );
}

const found = [];
const broken = [];
walk(tree, [`${tree.name}@${tree.version}`], found, broken);

if (broken.length > 0) {
  cannotObserve(
    `the listing records packages as missing or invalid:\n        ${broken.join(
      "\n        ",
    )}`,
    "a partly installed tree cannot be searched exhaustively, so an absence in it means nothing",
    "run npm ci to install the tree the lock file describes, then run this again",
  );
}

if (found.length > 0) {
  console.error(
    "The production dependency tree still reaches an advisory carrier.",
  );
  console.error(
    `  WHAT: ${
      found.length
    } path(s) a consumer would install:\n        ${found.join("\n        ")}`,
  );
  console.error(
    "  WHY:  uuid carries GHSA-w5hq-g745-h8pq in runtime scope and jest-cucumber is the only",
  );
  console.error(
    "        route to it. While either is in this tree, every consumer of this package",
  );
  console.error(
    "        inherits an advisory they cannot fix, which is the problem this work exists for.",
  );
  console.error(
    "  HOW:  remove jest-cucumber from package.json dependencies, depend on the pinned",
  );
  console.error(
    "        CommonJS cucumber line directly, and regenerate package-lock.json so npm ci in a",
  );
  console.error("        clean checkout installs no uuid at all.");
  process.exit(1);
}

const countPackages = (node) =>
  Object.values(node.dependencies || {}).reduce(
    (total, child) => total + 1 + countPackages(child),
    0,
  );

console.log(
  "The production dependency tree holds no jest-cucumber and no uuid.\n" +
    `  packages searched: ${countPackages(
      tree,
    )} (production scope, whole tree)\n` +
    `  names refused:     ${FORBIDDEN.join(", ")}\n` +
    `  root:              ${tree.name}@${tree.version}`,
);
