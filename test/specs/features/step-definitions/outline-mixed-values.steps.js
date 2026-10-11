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

// One definition per wording the Examples rows produce: each regular expression mirrors one row
// (USD and fantastic, CAD and fantastic, CAD and rebate), and all three share one handler. Keep
// them apart. Version 2.0.0 matched the template text, which all three definitions match, and
// refused the step as ambiguous; three separate definitions are what make this test tell the two
// versions apart. Each captures the item, the starting price and the price paid.
const sellAtPrice = (item, startingPrice, expectedSalesPrice) => {
  // Every row starts at $100, so a starting price in the wrong place in the text fails here.
  expect(parseInt(startingPrice)).toBe(100);
  salesPrice = onlineSales.sellItem(item) ? parseInt(expectedSalesPrice) : null;
};

When(
  // row 1
  /^I sell all my (.*) with a starting price of \$(\d+) at the fantastic price of (\d+)\$ USD which is nice$/,
  sellAtPrice,
);

When(
  // row 2
  /^I sell all my (.*) with a starting price of \$(\d+) at the fantastic price of (\d+)\$ CAD which is nice$/,
  sellAtPrice,
);

When(
  // row 3: only the word "rebate" differs from row 2
  /^I sell all my (.*) with a starting price of \$(\d+) at the rebate price of (\d+)\$ CAD which is nice$/,
  sellAtPrice,
);

Then(/^I should still get \$(\d+)$/, (expectedSalesPrice) => {
  expect(salesPrice).toBe(parseInt(expectedSalesPrice));
});

Fusion("../outline-mixed-values.feature");
