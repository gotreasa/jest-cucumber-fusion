class TodoList {
  constructor() {
    this.items = [];
  }

  add(todo) {
    // includes, not indexOf: indexOf is -1 (truthy) when "youtube" is absent, so every add
    // emptied the list and the feature passed by accident (documentation review, 2026-10-10).
    if (todo.name.toLocaleLowerCase().includes("youtube")) {
      this.items = [];
      this.items.push(todo);
      this.items.push({
        name: "Sign up for unemployment",
        priority: "high",
      });
    } else {
      this.items.push(todo);
    }
  }
}

export { TodoList };
