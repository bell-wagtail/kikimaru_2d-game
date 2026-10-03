import { test } from "node:test";
import assert from "node:assert/strict";
import { canLandOnGround, groundSegments, mergeGroundHoles, validateGroundHoles } from "../src/ground.ts";

test("overlapping and adjacent holes share one opening and never draw an internal bank without a wall", () => {
  const holes = [{ id: "b", x: 120, width: 100 }, { id: "a", x: 0, width: 180 }, { id: "c", x: 220, width: 60 }, { id: "d", x: 400, width: 50 }];
  assert.deepEqual(mergeGroundHoles(holes), [{ id: "a", x: 0, width: 280 }, { id: "d", x: 400, width: 50 }]);
  assert.equal(holes[1].width, 180);
  assert.equal(holes[0].id, "b");
});

test("floor segments subtract holes, clip the window, and merge overlapping or adjacent openings", () => {
  const holes = [
    { id: "right", x: 80, width: 40 },
    { id: "overlap", x: 30, width: 20 },
    { id: "left", x: -20, width: 40 },
    { id: "adjacent", x: 50, width: 10 }
  ];
  assert.deepEqual(groundSegments(0, 100, holes), [{ left: 20, right: 30 }, { left: 60, right: 80 }]);
  assert.deepEqual(groundSegments(200, 300, holes), [{ left: 200, right: 300 }]);
  assert.deepEqual(groundSegments(-10, 10, holes), []);
  assert.deepEqual(groundSegments(0, 100, [{ id: "a", x: 20, width: 30 }, { id: "b", x: 40, width: 30 }]),
    [{ left: 0, right: 20 }, { left: 70, right: 100 }]);
  assert.equal(holes[0].id, "right");
});

test("floor accepts descending players from above and never catches players already below the bank", () => {
  assert.equal(canLandOnGround(550, 0, 550), true);
  assert.equal(canLandOnGround(540, 200, 550), true);
  assert.equal(canLandOnGround(550, -620, 550), false);
  assert.equal(canLandOnGround(551, 200, 550), false);
});

test("hole definitions reject duplicate IDs, nonfinite coordinates, and nonpositive widths", () => {
  const hole = { id: "pit", x: -100, width: 180 };
  assert.doesNotThrow(() => validateGroundHoles([hole]));
  assert.throws(() => validateGroundHoles([hole, hole]));
  for (const invalid of [{ id: "" }, { x: NaN }, { width: 0 }, { width: -1 }, { width: Infinity }, { x: 1e308, width: 1e308 }]) {
    assert.throws(() => validateGroundHoles([{ ...hole, ...invalid }]));
  }
});
