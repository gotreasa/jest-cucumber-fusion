const { Given, When, Then, Fusion, Before } = require("../../../../src");

const { OnlineSales } = require("../../../src/online-sales");

const onlineSales = new OnlineSales();

// Every scenario (and every example row) starts from an empty shop. The hook is what
// isolates them from one another, so a scenario's outcome is decided by its own steps.
Before(() => {
  onlineSales.listedItems = [];
});

// A Given ESTABLISHES the precondition -- it does not assert it. The shop is emptied by
// the hook above, so listing exactly nItems here is what puts the scenario in its
// starting state.
Given(/^I have (\d+) items for sale$/, (nItems) => {
  for (let itemNumber = 1; itemNumber <= Number(nItems); itemNumber += 1) {
    onlineSales.listItem(`Item already for sale ${itemNumber}`);
  }
});

When(/^I bought "(.+)"/, (item) => {
  onlineSales.buyItem(item);
});

When(/^I bought the following items:$/, (table) => {
  table.forEach((row) => {
    onlineSales.buyItem(row.Item);
  });
});

Then(/^I have (\d+) items for sale$/, (nItems) => {
  expect(onlineSales.nItems()).toBe(Number(nItems));
});

Then(/^I want to sell (\d+) items if they in list$/, (nItems, table) => {
  let itemsLeftToSell = Number(nItems);

  table.forEach((row) => {
    const itemIsForSale = onlineSales.listedItems.includes(row.Item);
    const itemsBeforeTheSale = onlineSales.nItems();

    if (itemIsForSale && itemsLeftToSell > 0) {
      onlineSales.sellItem(row.Item);

      expect(onlineSales.listedItems).not.toContain(row.Item);
      expect(onlineSales.nItems()).toBe(itemsBeforeTheSale - 1);
      itemsLeftToSell -= 1;
    } else if (!itemIsForSale) {
      // Nobody ever listed this one: there is no sale to make and the shop is untouched
      expect(onlineSales.sellItem(row.Item)).toBeNull();
      expect(onlineSales.nItems()).toBe(itemsBeforeTheSale);
    }
  });
});

Fusion("../scenario-outline2.feature");
