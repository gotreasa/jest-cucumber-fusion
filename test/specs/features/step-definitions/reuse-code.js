import { When, Then, And } from "../../../../src/index.js";

export default (fnRocket) => {
  When("I relaunch the rocket", () => {
    const rocketUsed = fnRocket();
    rocketUsed.launch();
  });

  Then("the rocket end up in space again", () => {
    const rocketUsed = fnRocket();
    expect(rocketUsed.isInSpace).toBe(true);
  });

  // The mic drop is earned by reuse: the rocket is back in space AND its boosters
  // landed, so it can fly again. Registered inside the closure (not at module load)
  // so it reaches the rocket and is re-registered for every Fusion() that reuses it.
  And("I drop my mic", () => {
    const rocketUsed = fnRocket();
    expect(rocketUsed.isInSpace).toBe(true);
    expect(rocketUsed.boostersLanded).toBe(true);
  });
};
