# Running the examples

The examples are the feature files and step definition files under `test/specs/features`, written in JavaScript as ES modules. `npm test` builds the CommonJS bundle first and runs Jest in its ES module mode (`node --experimental-vm-modules`), so run the examples through it rather than through a bare `jest`. Working on the repository needs Node 20.11 or newer: the suite loads the ES module source, and the build and baseline scripts use `import.meta.dirname`.

First, install the dependencies:

```
$ npm install
```

## Running examples from the CMD line


```
$ npm test
```
