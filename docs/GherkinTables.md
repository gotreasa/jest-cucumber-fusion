# Gherkin tables

The examples on this page are ES modules, laid out as in [Getting Started](../README.md#getting-started). For CommonJS, see [Using CommonJS](./CommonJS.md).

A step can carry a data table. Fusion passes it to the step function as its last argument: an array with one object per row, keyed by the table's header row, with every value a string.

```gherkin
# filename: test/features/todo-list.feature
Feature: Todo List

Scenario: Adding an item to my todo list
  Given my todo list currently looks as follows:
    | TaskName            | Priority |
    | Fix bugs in my code | medium   |
    | Document my hours   | medium   |
  When I add the following task:
    | TaskName           | Priority |
    | Review the release | high     |
  Then I should see the following todo list:
    | TaskName            | Priority |
    | Fix bugs in my code | medium   |
    | Document my hours   | medium   |
    | Review the release  | high     |
```

The code under test:

```javascript
// filename: src/todo-list.js
export class TodoList {
    items = []

    add( todo ) {
        this.items.push( todo )
    }
}
```

The steps read each table row by its header names:

```javascript
// filename: test/features/todo-list.steps.js
import { Before, Given, When, Then, Fusion } from '@g_package/jest-cucumber-fusion'

import { TodoList } from '../../src/todo-list.js'

let todoList

Before( () => {
    todoList = new TodoList()
} )

Given( 'my todo list currently looks as follows:', ( table ) => {
    table.forEach( ( row ) => {
        todoList.add( { name: row.TaskName, priority: row.Priority } )
    } )
} )

When( 'I add the following task:', ( table ) => {
    todoList.add( { name: table[ 0 ].TaskName, priority: table[ 0 ].Priority } )
} )

Then( 'I should see the following todo list:', ( table ) => {
    expect( todoList.items ).toStrictEqual(
        table.map( ( row ) => ( { name: row.TaskName, priority: row.Priority } ) ),
    )
} )

Fusion( 'todo-list.feature' )
```

The first row is always the header, so a table of one row arrives as an empty array, and there is no form that reads a table as raw rows or as key-value pairs down its side. To use a two-column table as a lookup, build the object yourself from its rows.

A step with a table and captures receives the captures first, in order, and the table last. See [Step definition arguments](./StepDefinitionArguments.md).

Next: [Scenario outlines](./ScenarioOutlines.md), to run one scenario for every row of an `Examples` table.
