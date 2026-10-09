/**
 * The dependency direction inside src/ is inward, and it is a law rather than a convention.
 *
 * jest and the @cucumber packages are runtime dependencies by design; nothing here keeps them
 * out. What it keeps is WHERE each dependency lives. The obligations, checked over the src/
 * tree AS IT EXISTS, so a module added later is governed the day it arrives:
 *
 *   1. no file under src/ requires jest-cucumber, the dependency the 3.0.0 Request removed;
 *   2. each module requires exactly what the Requires column of docs/Architecture.md lists
 *      for it, and every module has a row. A new module fails until it is given one, and a
 *      require moved between modules is a visible edit to the table;
 *   3. only src/test-registration.js touches a Jest global, so registration order lives in
 *      one module;
 *   4. src/index.js exports exactly the nine public names, so a port does not leak out as an
 *      export and the dropped `runner` option cannot come back under a new name.
 *
 * Until 2026-10-09, obligation 2 was two rules (only feature-source reaches the outside world;
 * core modules require nothing but each other and util). They overlapped, and the first missed
 * a require of path or url outside the core. Gearoid merged them into the table check after an
 * adversarial review of PR #16.
 *
 * HOW IT READS THE SOURCE. Comments in this package name jest-cucumber, describe and test
 * constantly -- they explain what is being replaced. A grep would therefore flag prose. So
 * each file is scanned once into two texts: one with comments removed (used to find require
 * targets) and one with comments AND string contents removed (used to find references to a
 * Jest global). A regex method call such as `pattern.test(text)` is not a reference to the
 * Jest `test`, so an identifier reached through a dot is never counted.
 *
 * CURRENT STATUS against the 2.0.0 tree:
 *   RED   — src/index.js requires jest-cucumber, requires callsites and names beforeEach and
 *           afterEach, and src/feature-source.js and src/test-registration.js do not exist.
 *   GREEN — the export list is already exactly the eight public names.
 */

const fs = require("fs");
const path = require("path");

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
const sourceRoot = path.join(repositoryRoot, "src");
const ARCHITECTURE_DOC = path.join(repositoryRoot, "docs", "Architecture.md");

const THE_DEPENDENCY_BEING_REMOVED = "jest-cucumber";

// The one module allowed to touch the Jest runner, and what counts as touching it.
const TEST_REGISTRATION = "src/test-registration.js";
const JEST_GLOBALS = [
  "describe",
  "test",
  "it",
  "expect",
  "beforeEach",
  "afterEach",
  "beforeAll",
  "afterAll",
];
const JEST_GLOBAL_REFERENCE = new RegExp(
  `(?<![\\w$.])(${JEST_GLOBALS.join("|")})(?![\\w$])`,
  "g"
);

// The public surface, and the only list this law compares the real export set against.
//
// setFusionConfiguration is the ninth name and the only export this Request adds. It arrives
// at value 5, which replaces the global configuration path that left with the removed
// intermediary: a consumer lists one script in Jest's setupFiles, calls the setter there, and
// every step definition file in that run is configured by it. A global configuration path with
// no public entry point is not a configuration path, so the ninth export is not avoidable.
//
// This list is the one line of this file that value 5 revises, deliberately and by the
// acceptance designer rather than by craft, because the file carries a recorded oracle witness
// from value 1. Everything else stays byte-identical to keep that re-record to the minimum --
// including the header above, which still counts eight. That is not an oversight: correcting
// the prose would be a second change to a file whose whole point, here, is that only one thing
// about it moved.
const PUBLIC_EXPORTS = [
  "Given",
  "When",
  "Then",
  "And",
  "But",
  "Before",
  "After",
  "Fusion",
  "setFusionConfiguration",
];

// --- reading the source --------------------------------------------------------------------

const everyJavaScriptFileUnder = (directory) => {
  const found = [];

  const descend = (current) => {
    fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) descend(absolute);
      else if (entry.name.endsWith(".js")) found.push(absolute);
    });
  };

  descend(directory);
  return found.sort();
};

// One pass over the characters. `blankStrings` decides whether the contents of a string
// literal survive: they must for require("..."), and must not for identifier checks.
const stripped = (source, { blankStrings }) => {
  let out = "";
  let index = 0;

  while (index < source.length) {
    const here = source[index];
    const next = source[index + 1];

    if (here === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    if (here === "/" && next === "*") {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) {
        index += 1;
      }
      index += 2;
      continue;
    }
    if (here === '"' || here === "'" || here === "`") {
      const quote = here;
      out += quote;
      index += 1;
      while (index < source.length && source[index] !== quote) {
        if (source[index] === "\\") {
          if (!blankStrings) out += source.slice(index, index + 2);
          index += 2;
          continue;
        }
        if (!blankStrings) out += source[index];
        index += 1;
      }
      out += quote;
      index += 1;
      continue;
    }

    out += here;
    index += 1;
  }

  return out;
};

// A require whose argument is not one string literal (`require(name)`, a template) cannot be
// checked against the table, so it is counted and refused rather than silently skipped.
const unreadableRequiresIn = (code) =>
  (code.match(/\brequire\s*\(/g) || []).length - requireTargetsIn(code).length;

const requireTargetsIn = (code) => {
  const targets = [];
  const pattern = /\brequire\s*\(\s*(['"])([^'"]+)\1\s*\)/g;
  let match = pattern.exec(code);
  while (match) {
    targets.push(match[2]);
    match = pattern.exec(code);
  }
  return targets;
};

const theSourceTree = everyJavaScriptFileUnder(sourceRoot).map((absolute) => {
  const source = fs.readFileSync(absolute, "utf8");
  return {
    modulePath: path
      .relative(repositoryRoot, absolute)
      .split(path.sep)
      .join("/"),
    requires: requireTargetsIn(stripped(source, { blankStrings: false })),
    unreadableRequires: unreadableRequiresIn(
      stripped(source, { blankStrings: false })
    ),
    identifiers: stripped(source, { blankStrings: true }),
  };
});

// --- the law -------------------------------------------------------------------------------

describe("the dependency direction inside src/ is inward", () => {
  test("the src/ tree can be enumerated, so an empty answer below means absence and not blindness", () => {
    // WHAT: at least the public surface is present in the enumerated tree.
    // WHY:  every check below is an absence check. An unreadable or empty src/ would make all
    //       of them pass while observing nothing at all, which is the one failure mode an
    //       architectural law cannot afford.
    // HOW:  keep src/index.js where package.json points `main`.
    expect(theSourceTree.length).toBeGreaterThan(0);
    expect(theSourceTree.map((each) => each.modulePath)).toContain(
      "src/index.js"
    );
  });

  test(`no module under src/ requires ${THE_DEPENDENCY_BEING_REMOVED}`, () => {
    const offenders = theSourceTree
      .filter((each) => each.requires.includes(THE_DEPENDENCY_BEING_REMOVED))
      .map((each) => each.modulePath);

    // WHAT: the modules that still require the dependency, out of the whole enumerated tree.
    // WHY:  while any file under src/ requires jest-cucumber, a consumer installing this
    //       package still inherits it and the uuid advisory that comes with it. One require
    //       anywhere in the tree undoes the entire Request.
    // HOW:  take the lifecycle over directly -- parse the feature and compile pickles in
    //       src/feature-source.js and register describe and test in src/test-registration.js --
    //       and delete the require.
    expect({
      modulesRequiringIt: offenders,
      modulesEnumerated: theSourceTree.length,
    }).toStrictEqual({
      modulesRequiringIt: [],
      modulesEnumerated: theSourceTree.length,
    });
  });

  test("each module requires exactly what the Architecture table lists for it", () => {
    const tableRows = fs
      .readFileSync(ARCHITECTURE_DOC, "utf8")
      .split("\n")
      .filter((line) => /^\| `[a-z-]+\.js` \|/.test(line));
    // The Requires column, as written: each backticked name, a module of src/ by its bare name
    // or a package by its own. "nothing" and "Jest globals" name no require.
    const listed = Object.fromEntries(
      tableRows.map((line) => {
        const cells = line.split("|").map((cell) => cell.trim());
        const requiresCell = cells[cells.length - 2];
        return [
          `src/${cells[1].replace(/`/g, "")}`,
          (requiresCell.match(/`[^`]+`/g) || [])
            .map((name) => name.replace(/`/g, ""))
            .sort(),
        ];
      })
    );
    // The same names from the code: "./keywords" is listed as keywords, "node:fs" as fs.
    const asListed = (target) =>
      target
        .replace(/^\.\//, "")
        .replace(/\.js$/, "")
        .replace(/^node:/, "");

    const mismatches = theSourceTree.flatMap((each) => {
      const actual = [...new Set(each.requires.map(asListed))].sort();
      const expected = listed[each.modulePath];
      if (!expected) return [`${each.modulePath} has no row in the table`];
      const unlisted = actual.filter((name) => !expected.includes(name));
      const unused = expected.filter((name) => !actual.includes(name));
      return [
        ...unlisted.map(
          (name) => `${each.modulePath} requires ${name}, unlisted`
        ),
        ...unused.map(
          (name) =>
            `${each.modulePath} is listed as requiring ${name}, but does not`
        ),
        ...(each.unreadableRequires > 0
          ? [
              `${each.modulePath} has a require whose target is not a string literal`,
            ]
          : []),
      ];
    });
    const rowsWithoutAFile = Object.keys(listed).filter(
      (modulePath) =>
        !theSourceTree.some((each) => each.modulePath === modulePath)
    );

    // WHAT: every difference between what a module requires and what the table says it does.
    // WHY:  jest and the @cucumber packages are runtime dependencies by design; this rule does
    //       not keep them out. It keeps each one in a known place: the filesystem, the parser
    //       and the caller stack in src/feature-source.js, nothing outside the package in the
    //       core. The table is that map, and a change to where something is required becomes
    //       a visible edit to it instead of a drift nobody sees.
    // HOW:  require the module where the table says it belongs, or, if the design really
    //       changed, change the table row in docs/Architecture.md in the same commit.
    expect(tableRows.length).toBeGreaterThan(0);
    expect({ mismatches, rowsWithoutAFile }).toStrictEqual({
      mismatches: [],
      rowsWithoutAFile: [],
    });
  });

  test(`only ${TEST_REGISTRATION} touches a Jest global`, () => {
    const offenders = [];

    theSourceTree.forEach((each) => {
      if (each.modulePath === TEST_REGISTRATION) return;
      const named = new Set();
      let match = JEST_GLOBAL_REFERENCE.exec(each.identifiers);
      while (match) {
        named.add(match[1]);
        match = JEST_GLOBAL_REFERENCE.exec(each.identifiers);
      }
      if (named.size > 0) {
        offenders.push(
          `${each.modulePath} names ${[...named].sort().join(", ")}`
        );
      }
    });

    // WHAT: every module other than the test-registration port that names a Jest global.
    // WHY:  running under Jest is the product, so this is not about leaving Jest. It is about
    //       registration ORDER: binding every step before registering anything, hooks once per
    //       test, skipped scenarios as test.skip. The package's real bugs have lived there, and
    //       they stay findable while one module is the only one that registers.
    // HOW:  pass nothing but values across the boundary and let src/test-registration.js be
    //       the only module that registers anything.
    expect(offenders).toStrictEqual([]);
  });

  test("src/index.js exports exactly the public surface and nothing more", () => {
    // Required through the package entry point, the way a consumer requires it.
    const publicSurface = require("../../../src");

    // WHAT: the exported names, as a sorted set.
    // WHY:  an export is a promise that cannot be withdrawn inside a major. A seam exported
    //       "just for tests" becomes a consumer's dependency, and this is where the removed
    //       `runner` option would quietly come back.
    // HOW:  export the step verbs, the hooks and Fusion. Keep src/feature-source.js and
    //       src/test-registration.js internal module paths, reached by require, never exports.
    expect(Object.keys(publicSurface).sort()).toStrictEqual(
      [...PUBLIC_EXPORTS].sort()
    );
  });
});
