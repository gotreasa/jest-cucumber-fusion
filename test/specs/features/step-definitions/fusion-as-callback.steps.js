// Fusion passed straight to a native higher-order function, `[...].forEach(Fusion)`, is called
// from a native frame with no file name. The caller lookup took that frame as "the file that
// calls Fusion" and resolved the feature path against the working directory, so the feature
// beside this file was not found, and the refusal named the wrong directory. Frames with no
// file name are skipped, so the path resolves from this file. Found by the PR #16 adversarial
// review (finding F7), 2026-10-09.
const { Given, Fusion } = require("../../../../src");

Given("the feature was found next to its caller", () => {});

["../../fixtures/callback-caller.feature"].forEach(Fusion);

// A Node internal frame has a file name, `node:events` here, but it is not a file on disk, so
// it is skipped too and the path still resolves from this file (found by the review of the PR
// #16 fixes).
const { EventEmitter } = require("events");
const emitter = new EventEmitter();
emitter.on("load", Fusion);
// Each Fusion() starts from an empty registry, so the step is registered again.
Given("the feature was found next to its caller", () => {});
emitter.emit("load", "../../fixtures/callback-caller.feature");
