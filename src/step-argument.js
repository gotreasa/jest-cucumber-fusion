// A pickle step's Gherkin argument, turned into the shape a consumer's step function receives.
//
// A pickle hands back a dataTable of rows of cells, or a docString with content. A step
// function receives an array of header-keyed row objects, or a plain string. That transform
// belonged to the removed intermediary (parsed-feature-loading.js:33-63) and is owned here.
//
// Two values have to survive, because a consumer wrote them down on purpose: the EMPTY string
// from an empty docstring, and the EMPTY array from a header-only table. Both are falsy, so
// every test here is for PRESENCE — never truthiness, never `.length`.

// `null` means "this step carries no argument", which is a different fact from an empty one.
const NO_STEP_ARGUMENT = null;

const cellValues = (row) => (row.cells || []).map((cell) => cell.value);

// Header row names the keys; every later row becomes one object under those keys. A
// header-only table is an empty array of rows, not an absent argument.
const asRowObjects = (dataTable) => {
  const [header, ...bodyRows] = dataTable.rows || [];
  if (!header) return [];

  const columnNames = cellValues(header);

  return bodyRows.map((row) =>
    cellValues(row).reduce(
      (rowObject, value, columnIndex) =>
        Object.assign(rowObject, { [columnNames[columnIndex]]: value }),
      {}
    )
  );
};

const stepArgumentFrom = (pickleStepArgument) => {
  if (pickleStepArgument == null) return NO_STEP_ARGUMENT;

  if (pickleStepArgument.dataTable)
    return asRowObjects(pickleStepArgument.dataTable);

  // `content` is read by presence: an empty docstring is "" and must reach the step.
  if (pickleStepArgument.docString)
    return pickleStepArgument.docString.content == null
      ? NO_STEP_ARGUMENT
      : pickleStepArgument.docString.content;

  return NO_STEP_ARGUMENT;
};

module.exports.stepArgumentFrom = stepArgumentFrom;
