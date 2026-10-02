const { Given, When, Then, And, But, Fusion } = require("../../../../src");

const { Rocket } = require("../../../src/rocket");

let rocket;
let rocketOnTheLaunchpad;

const observableRocketState = () => ({
  isInSpace: rocket.isInSpace,
  boostersLanded: rocket.boostersLanded,
});

Given("I am Elon Musk attempting to launch a rocket into space", () => {
  rocket = new Rocket();
  // Remember how the rocket sat on the pad, so a later step can prove it moved
  rocketOnTheLaunchpad = observableRocketState();
});

When("I launch the rocket", () => {
  rocket.launch();
});

When("I launch the '<rocket>'", () => {
  rocket.launch();
});

When(/^I launch my personal rocket named '(.*)'$/, (nameRocket) => {
  expect(nameRocket).toBe("<space poney==>");
  rocket.launch();
});

Then("the rocket should end up in space", () => {
  expect(rocket.isInSpace).toBe(true);
});

/// Complex Regex :  at position (\[(?: *\d+(?: |, |,)*)+\]) with no value
And(
  /^my position in 2D space is (\[(?: *\d+(?: |, |,)*)+\])$/,
  (arrayPosition) => {
    const isAnArray = JSON.parse(arrayPosition);
    expect(isAnArray).toBeInstanceOf(Array);
  }
);

And(/^the booster\(s\) should land back on the launch pad$/, () => {
  expect(rocket.boostersLanded).toBe(true);
});

But("nobody should doubt me ever again", () => {
  // The doubt is that the rocket never really flew. It sat on the pad — grounded,
  // boosters intact — and it is now in space with its boosters recovered.
  expect(rocketOnTheLaunchpad).toEqual({
    isInSpace: false,
    boostersLanded: true,
  });
  expect(observableRocketState()).toEqual({
    isInSpace: true,
    boostersLanded: true,
  });
});

Fusion("../basic-scenarios.feature");
