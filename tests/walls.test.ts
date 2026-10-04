import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStageMap } from "../src/stageMap.ts";
import { localWalls, validateWalls, wallContacts } from "../src/walls.ts";
import { PLAYER } from "../src/movement.ts";

const grid = { cellWidth: 60, cellHeight: 36, originX: 0, groundY: 550 };
const map = (row: string, changed = grid) => parseStageMap(`${row}\n${"=".repeat(row.length)}`, changed);

test("L/R reserve their cells outside the playable area and follow grid size and origin", () => {
  for (const originX of [-24576, 0, 24576]) {
    const stage = map("L..I.S.Q..G..R", { ...grid, cellWidth: 80, cellHeight: 44, originX });
    assert.deepEqual(stage.walls, { left: originX + 80, right: originX + 1040 });
    assert.equal(stage.items.length, 2);
    assert.equal(stage.items[0].kind, "strawberry");
    assert.equal(stage.items[1].kind, "quiz");
    assert.equal(stage.obstacles.length, 0);
  }
  const differentRows = parseStageMap("L.............\n...I......G..R\n==============", grid);
  assert.deepEqual(differentRows.walls, { left: 60, right: 780 });
});

test("wall markers are optional independently and legacy maps stay unbounded", () => {
  assert.equal(map("I.S.Q.G").walls, undefined);
  assert.deepEqual(map("L..I...").walls, { left: 60 });
  assert.deepEqual(map("I...R").walls, { right: 240 });
  assert.doesNotThrow(() => validateWalls(undefined));
});

test("duplicate, reversed, too close, nonfinite walls and unreachable placements fail clearly", () => {
  assert.throws(() => map("LL..I...R"), /1行2列.*複数指定/);
  assert.throws(() => map("L..I..RR"), /1行8列.*複数指定/);
  assert.throws(() => map("R..I..L"), /1行1列.*LをRより左/);
  assert.throws(() => map("L.R"), /身体の幅/);
  assert.throws(() => map("LI....R"), /スタート/);
  assert.throws(() => map("L..I.GR"), /ゴール/);
  assert.throws(() => map("S.L..I...R"), /アイテムまたはクイズ/);
  assert.throws(() => map("L..I...R.Q"), /アイテムまたはクイズ/);
  assert.throws(() => map("..R"), /スタート/);
  for (const walls of [{ left: NaN }, { right: Infinity }, { left: -Number.MAX_VALUE, right: Number.MAX_VALUE }]) {
    assert.throws(() => validateWalls(walls));
  }
  assert.throws(() => parseStageMap("I..\nL=R", grid), /最下行/);
  assert.throws(() => map("L..I...R", { ...grid, originX: Number.MAX_VALUE, cellWidth: Number.MAX_VALUE }));
});

test("side contact holds at rest, in the air and below the floor across origin translations", () => {
  const walls = { left: 100, right: 1000 };
  for (const originX of [-24576, 0, 24576]) for (const top of [0, 370, 680]) {
    const limits = localWalls(walls, originX);
    const player = (left: number) => ({ left: left - originX, right: left + PLAYER.width - originX,
      top, bottom: top + PLAYER.height });
    assert.deepEqual(wallContacts(player(100), limits), { left: true, right: false });
    assert.deepEqual(wallContacts(player(910), limits), { left: false, right: true });
    assert.deepEqual(wallContacts(player(101), limits), { left: false, right: false });
    assert.deepEqual(wallContacts(player(909), limits), { left: false, right: false });
    assert.deepEqual(wallContacts(player(0), limits), { left: true, right: false });
    assert.deepEqual(wallContacts(player(1100), limits), { left: false, right: true });
    assert.deepEqual(wallContacts(player(0), {}), { left: false, right: false });
    assert.deepEqual(wallContacts(player(0), { right: limits.right }), { left: false, right: false });
  }
});
