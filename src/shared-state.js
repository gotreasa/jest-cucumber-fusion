// The state every copy of Fusion in one test file must share: the step and hook registry, and
// the global configuration.
//
// The package is dual. A file that require()s it loads dist/index.cjs; a file that imports it
// loads src/. Those are two copies, each with its own module variables, so state kept in a
// module variable splits between them: a shared step library written as CommonJS registered
// steps an ES module step file's Fusion() call could not see, and a global set by a require()ing
// setup script never reached importing steps (both measured with packed builds, and held by
// test/specs/baseline/assert-packaged-consumer.js).
//
// So the state lives on globalThis, under one key. Jest gives each test file its own global, so
// it stays per file exactly as a module variable did. The key names the major version: every
// 3.x copy shares it, and a future major whose state has another shape cannot read this one.
//
// A value is created only when absent. A copy that loads second must not reset what the first
// copy has already registered.
const STORE = Symbol.for("@g_package/jest-cucumber-fusion@3");

const store = () => {
  if (!globalThis[STORE]) globalThis[STORE] = {};
  return globalThis[STORE];
};

// The shared value under `name`, created by `initialValue()` the first time it is asked for.
const shared = (name, initialValue) => {
  const state = store();
  if (!Object.prototype.hasOwnProperty.call(state, name))
    state[name] = initialValue();
  return state[name];
};

const replaceShared = (name, value) => {
  store()[name] = value;
};

export { shared, replaceShared };
