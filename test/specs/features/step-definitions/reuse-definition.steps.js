import { Given, Then, And, Fusion } from "../../../../src/index.js";

import { Rocket } from "../../../src/rocket.js";
import reuseCode from "./reuse-code.js";

let rocket;
function getCurrentRocket() {
  return rocket;
}

Given(/^I am Elon Musk and I launched a rocket in space already$/, () => {
  rocket = new Rocket();
});

reuseCode(getCurrentRocket);

// The critics speak in the order the feature quotes them: the Then hears 'a success'
// and the And -- the very same definition, reused under a second keyword -- hears
// 'a wonder'. Pinning the exact verdict per invocation is what proves each step is
// handed its OWN captured argument; a shared or stale capture would hand both the same.
const verdictsStillToHear = ["a success", "a wonder"];

Then(
  And(/^the mission was said to be '(.*)'$/, (sayingForTheMission) => {
    expect(sayingForTheMission).toBe(verdictsStillToHear.shift());
    // The critics can only speak of the mission at all because the rocket flew
    expect(rocket.isInSpace).toBe(true);
  }),
);

Fusion("../reuse-definition.feature");
