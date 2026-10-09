# Running the examples

The examples are the feature files and step definition files under `test/specs/features`, written in JavaScript as ES modules. `npm test` builds the CommonJS bundle first and runs Jest in its ES module mode (`node --experimental-vm-modules`), so run the examples through it rather than through a bare `jest`.

First, install the dependencies:

```
$ npm install
```

## Running examples from the CMD line


```
$ npm test
```
