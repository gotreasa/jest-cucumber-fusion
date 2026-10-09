// Builds dist/index.cjs: the CommonJS entry point of the dual package.
//
// Fusion's source is ES modules, and so are its parser dependencies (@cucumber/gherkin 42,
// @cucumber/messages 34, @cucumber/tag-expressions 11) and callsites 4. A consumer whose step
// files require() the package runs inside Jest's CommonJS module system, which cannot load an
// ES module. So `require` resolves to this bundle instead, with those dependencies inlined and
// rewritten as CommonJS; `import` still resolves to src/ (package.json, "exports").
//
// Two details make the bundle behave like the source:
//   - import.meta.url does not exist in CommonJS. feature-source.js uses it to recognise its
//     own stack frames, so it is defined as the bundle's own file URL;
//   - the bundled packages are MIT licensed, which requires their notices to travel with the
//     code, so each one's licence is copied into dist/THIRD_PARTY_LICENSES.txt, read from the
//     list of files esbuild actually bundled.
import fs from "fs";
import path from "path";
import { build } from "esbuild";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");

fs.rmSync(dist, { recursive: true, force: true });

const result = await build({
  entryPoints: [path.join(root, "src", "index.js")],
  outfile: path.join(dist, "index.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  define: { "import.meta.url": "__fusionModuleUrl" },
  banner: {
    js: 'const __fusionModuleUrl = require("url").pathToFileURL(__filename).href;',
  },
  legalComments: "none",
  metafile: true,
  logLevel: "warning",
});

// One licence per bundled package, found from the paths esbuild read.
const packageRoots = [
  ...new Set(
    Object.keys(result.metafile.inputs)
      .map((input) => input.match(/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//))
      .filter(Boolean)
      .map((match) => path.join(root, match[1])),
  ),
].sort();

const notices = packageRoots.map((packageRoot) => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
  );
  const licenceFile = fs
    .readdirSync(packageRoot)
    .find((name) => /^licen[cs]e/i.test(name));
  if (!licenceFile)
    throw new Error(`No licence file found for bundled ${manifest.name}`);
  return (
    `${manifest.name}@${manifest.version} (${manifest.license})\n\n` +
    fs.readFileSync(path.join(packageRoot, licenceFile), "utf8").trim()
  );
});

// The same declarations, as CommonJS-shaped typings for TypeScript consumers that require().
fs.copyFileSync(
  path.join(root, "src", "index.d.ts"),
  path.join(dist, "index.d.cts"),
);

fs.writeFileSync(
  path.join(dist, "THIRD_PARTY_LICENSES.txt"),
  "dist/index.cjs bundles the following packages.\n\n" +
    notices.join(`\n\n${"-".repeat(72)}\n\n`) +
    "\n",
);

// stderr, not stdout: npm pack --json runs this through prepack and prints its JSON to stdout.
console.error(
  `dist/index.cjs built, bundling ${packageRoots.length} packages: ${packageRoots
    .map((packageRoot) =>
      path.relative(path.join(root, "node_modules"), packageRoot),
    )
    .join(", ")}`,
);
