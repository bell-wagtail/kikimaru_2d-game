import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceTile, rebaseBody, rebaseShift, REBASE_DISTANCE, seamBlendAlpha, wrap } from "../src/scrolling.ts";

function near(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
}

test("negative and positive movement crosses a tile seam without changing visual phase", () => {
  const width = 1488, scale = 650 / 1024, factor = 0.35;
  const period = width * scale / factor;
  const start = 0.25;
  for (const cycles of [-10000, -2, -1, 0, 1, 2, 10000]) {
    near(advanceTile(start, cycles * period + 10, scale, factor, width), advanceTile(start, 10, scale, factor, width));
  }
  const left = advanceTile(0, -0.01, scale, factor, width);
  assert.ok(left > width - 1 && left < width);
  near(advanceTile(left, 0.01, scale, factor, width), 0);
});

test("a long walk and its return keep texture and physics coordinates bounded", () => {
  const origin = 600, width = 1488, scale = 650 / 1024, factor = 0.35;
  let x = origin, previous = origin, phase = 0, ground = 0;
  for (const direction of [1, -1]) {
    for (let frame = 0; frame < 200000; frame++) {
      x += direction * 4.25;
      const distance = x - previous;
      phase = advanceTile(phase, distance, scale, factor, width);
      ground = advanceTile(ground, distance, 1, 1, 315);
      x -= rebaseShift(x, origin);
      previous = x;
      assert.ok(Math.abs(x - origin) < REBASE_DISTANCE);
      assert.ok(phase >= 0 && phase < width);
      assert.ok(ground >= 0 && ground < 315);
    }
  }
  near(x, origin);
  near(Math.min(phase, width - phase), 0);
  near(Math.min(ground, 315 - ground), 0);
});

test("rebasing in either direction preserves motion deltas and airborne state", () => {
  for (const sign of [-1, 1]) {
    const x = 600 + sign * (REBASE_DISTANCE + 10);
    const object = { x: x - sign * 4 };
    const body = {
      position: { x: x - 45, y: 210 }, prev: { x: x - 45 - sign * 4 },
      prevFrame: { x: x - 45 - sign * 4 }, center: { x },
      velocity: { x: sign * 260, y: -300 }, blocked: { down: false },
      updateCenter() { this.center.x = this.position.x + 45; }
    };
    const shift = rebaseShift(body.center.x, 600);
    rebaseBody(body, object, shift);
    near(body.center.x, 600 + sign * 10);
    near(body.position.x - body.prev.x, sign * 4);
    near(body.position.x - body.prevFrame.x, sign * 4);
    near(body.center.x - object.x, sign * 4);
    assert.equal(body.position.y, 210);
    assert.deepEqual(body.velocity, { x: sign * 260, y: -300 });
    assert.equal(body.blocked.down, false);
  }
});

test("seam blending joins the adjacent source pixels and fades monotonically", () => {
  assert.equal(seamBlendAlpha(0, 48), 1);
  assert.equal(seamBlendAlpha(47, 48), 0);
  for (let x = 1; x < 48; x++) {
    assert.ok(seamBlendAlpha(x, 48) <= seamBlendAlpha(x - 1, 48));
  }
  near(seamBlendAlpha(23, 48) + seamBlendAlpha(24, 48), 1);
  assert.equal(wrap(-1488, 1488), 0);
});
