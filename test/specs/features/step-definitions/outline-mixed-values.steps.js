import { Before, Given, When, Then, Fusion } from "../../../../src/index.js";

import { OnlineSales } from "../../../src/online-sales.js";

let onlineSales;
let salesPrice;

Before(() => {
  onlineSales = new OnlineSales();
});

Given(/^I want to sell all my (.*)$/, (item) => {
  onlineSales.listItem(item);
});

// One definition per wording the Examples rows produce, each capturing the item, the starting
// price and the price paid from the substituted text.
const sellAtPrice = (item, startingPrice, expectedSalesPrice) => {
  salesPrice = onlineSales.sellItem(item) ? parseInt(expectedSalesPrice) : null;
};

When(
  /^I sell all my (.*) with a starting price of \$(\d+) at the fantastic price of (\d+)\$ USD which is nice$/,
  sellAtPrice,
);

When(
  /^I sell all my (.*) with a starting price of \$(\d+) at the fantastic price of (\d+)\$ CAD which is nice$/,
  sellAtPrice,
);

When(
  /^I sell all my (.*) with a starting price of \$(\d+) at the rebate price of (\d+)\$ CAD which is nice$/,
  sellAtPrice,
);

Then(/^I should still get \$(\d+)$/, (expectedSalesPrice) => {
  expect(salesPrice).toBe(parseInt(expectedSalesPrice));
});

Fusion("../outline-mixed-values.feature");
