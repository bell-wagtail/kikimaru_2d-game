import { test } from "node:test";
import assert from "node:assert/strict";
import { sideContacts, validateObstacles } from "../src/obstacles.ts";

const rock = { left: 100, right: 160, top: 514, bottom: 550 };

test("side contact remains blocked at rest on either side, including after a shared origin shift", () => {
  for (const shift of [-16384, 0, 16384]) {
    const bounds = { ...rock, left: rock.left - shift, right: rock.right - shift };
    assert.deepEqual(sideContacts({ left: 10 - shift, right: 100 - shift, top: 370, bottom: 550 }, [bounds]), { left: false, right: true });
    assert.deepEqual(sideContacts({ left: 160 - shift, right: 250 - shift, top: 370, bottom: 550 }, [bounds]), { left: true, right: false });
  }
});

test("standing on top, passing above, underneath, and separated sides do not block horizontal movement", () => {
  for (const player of [
    { left: 10, right: 100, top: 334, bottom: 514 },
    { left: 160, right: 250, top: 330, bottom: 510 },
    { left: 10, right: 100, top: 550, bottom: 730 },
    { left: 9, right: 99, top: 370, bottom: 550 }
  ]) assert.deepEqual(sideContacts(player, [rock]), { left: false, right: false });
});

test("stage obstacles allow negative coordinates and reject duplicate IDs, unknown kinds, and invalid geometry", () => {
  const definition = { id: "rock", kind: "rock", x: -9000, y: 514, width: 60, height: 36 } as const;
  assert.doesNotThrow(() => validateObstacles([]));
  assert.doesNotThrow(() => validateObstacles([definition]));
  assert.throws(() => validateObstacles([definition, definition]));
  for (const invalid of [
    { id: "" }, { x: NaN }, { y: Infinity }, { width: 0 }, { height: -1 },
    { kind: "enemy" as "rock" }
  ]) assert.throws(() => validateObstacles([{ ...definition, ...invalid }]));
});
