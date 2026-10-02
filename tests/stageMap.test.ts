import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseStageMap } from "../src/stageMap.ts";
import { validateDecorations } from "../src/decorations.ts";

const grid = { cellWidth: 60, cellHeight: 36, originX: 0, groundY: 550 };

test("a text map places rocks from the ground upward and keeps tea separate from collision objects", () => {
  const map = parseStageMap(".o.\nxxx\n===", grid);
  assert.deepEqual(map.obstacles.map(({ x, y, width, height }) => ({ x, y, width, height })), [
    { x: 0, y: 514, width: 60, height: 36 },
    { x: 60, y: 514, width: 60, height: 36 },
    { x: 120, y: 514, width: 60, height: 36 }
  ]);
  assert.deepEqual(map.items, [{ id: "tea-r0-c1", kind: "tea", x: 60, y: 478, width: 60, height: 36 }]);
});

test("five adjacent x characters produce five individual rocks with unique stable IDs", () => {
  const text = ".....\nxxxxx\n=====";
  const map = parseStageMap(text, grid);
  assert.equal(map.obstacles.length, 5);
  assert.equal(new Set(map.obstacles.map(rock => rock.id)).size, 5);
  assert.deepEqual(map.obstacles.map(rock => rock.x), [0, 60, 120, 180, 240]);
  assert.deepEqual(parseStageMap(text, grid), map);
});

test("cell size and origin changes affect positions and dimensions together, including negative X", () => {
  const map = parseStageMap(".o\nx.\n==", { cellWidth: 80, cellHeight: 40, originX: -200, groundY: 500 });
  assert.deepEqual(map.obstacles[0], { id: "rock-r1-c0", kind: "rock", x: -200, y: 460, width: 80, height: 40 });
  assert.deepEqual(map.items[0], { id: "tea-r0-c1", kind: "tea", x: -120, y: 420, width: 80, height: 40 });
});

test("UTF-8 BOM, Windows line endings, outer empty lines, and space cells preserve the layout", () => {
  const plain = parseStageMap(".o\nx.\n==", grid);
  assert.deepEqual(parseStageMap("\uFEFF\r\n o\r\nx \r\n==\r\n\r\n", grid), plain);
});

test("the regression fixture contains three levels of rising steps and a five-rock upper row", () => {
  const text = readFileSync(new URL("./fixtures/stairs.txt", import.meta.url), "utf8");
  const map = parseStageMap(text, grid);
  assert.equal(map.obstacles.length, 9);
  assert.equal(map.items.length, 1);
  assert.deepEqual(map.obstacles.filter(rock => rock.y === 442).map(rock => rock.x), [1260, 1320, 1380, 1440, 1500]);
  assert.ok(map.obstacles.some(rock => rock.x === 1020 && rock.y === 514));
  assert.ok(map.obstacles.some(rock => rock.x === 1140 && rock.y === 478));
});

test("malformed rows, missing ground, and unsupported symbols fail with a helpful location", () => {
  for (const text of ["", "===", "x\n==", "x.\n=?", "x.\n\n=="]) assert.throws(() => parseStageMap(text, grid));
  assert.throws(() => parseStageMap(".?\n==", grid), /1行2列/);
  assert.throws(() => parseStageMap("=.\n==", grid), /1行1列/);
});

test("bottom-row blanks form finite holes while blanks above the floor stay empty", () => {
  const map = parseStageMap("..........\n=..== .===", grid);
  assert.deepEqual(map.holes, [
    { id: "hole-c1", x: 60, width: 120 },
    { id: "hole-c5", x: 300, width: 120 }
  ]);
  assert.equal(map.obstacles.length, 0);
  assert.deepEqual(parseStageMap("...\n===", grid).holes, []);
  assert.deepEqual(parseStageMap("...\n...", { ...grid, originX: -200, cellWidth: 80 }).holes,
    [{ id: "hole-c0", x: -200, width: 240 }]);
});

test("the editable stage remains valid without fixing its arrangement in regression tests", () => {
  const text = readFileSync(new URL("../src/stage-maps/tea-river.txt", import.meta.url), "utf8");
  assert.doesNotThrow(() => parseStageMap(text, grid));
});

test("invalid cell sizes, nonfinite origins, and overflowing output coordinates are rejected", () => {
  for (const invalid of [{ cellWidth: 0 }, { cellHeight: -1 }, { cellWidth: NaN }, { originX: Infinity }, { groundY: NaN }]) {
    assert.throws(() => parseStageMap(".x\n==", { ...grid, ...invalid }));
  }
  assert.throws(() => parseStageMap("..o\n===", { ...grid, cellWidth: 1e308 }));
});

test("legacy tea coordinate definitions reject duplicate IDs and invalid geometry", () => {
  const tea = { id: "tea", kind: "tea", x: -60, y: 406, width: 60, height: 36 } as const;
  assert.doesNotThrow(() => validateDecorations([tea]));
  assert.throws(() => validateDecorations([tea, tea]));
  assert.throws(() => validateDecorations([{ ...tea, kind: "enemy" as "tea" }]));
  assert.throws(() => validateDecorations([{ ...tea, width: 0 }]));
});

test("tea and shrimp symbols become items without altering rocks or holes at a changed origin and grid", () => {
  const map = parseStageMap("ojx\n=..", { ...grid, originX: -240, cellWidth: 80, cellHeight: 40 });
  assert.deepEqual(map.items, [
    { id: "tea-r0-c0", kind: "tea", x: -240, y: 510, width: 80, height: 40 },
    { id: "shrimp-r0-c1", kind: "shrimp", x: -160, y: 510, width: 80, height: 40 }
  ]);
  assert.deepEqual(map.obstacles, [{ id: "rock-r0-c2", kind: "rock", x: -80, y: 510, width: 80, height: 40 }]);
  assert.deepEqual(map.holes, [{ id: "hole-c1", x: -160, width: 160 }]);
});

test("fish, fruits and quiz markers share map geometry and IDs without creating rocks or changing holes", () => {
  const map = parseStageMap("FQMSx\n=....", { ...grid, originX: -240, cellWidth: 80, cellHeight: 40 });
  assert.deepEqual(map.items, [
    { id: "fish-r0-c0", kind: "fish", x: -240, y: 510, width: 80, height: 40 },
    { id: "quiz-r0-c1", kind: "quiz", x: -160, y: 510, width: 80, height: 40 },
    { id: "mandarin-r0-c2", kind: "mandarin", x: -80, y: 510, width: 80, height: 40 },
    { id: "strawberry-r0-c3", kind: "strawberry", x: 0, y: 510, width: 80, height: 40 }
  ]);
  assert.equal(map.obstacles.length, 1);
  assert.deepEqual(map.holes, [{ id: "hole-c1", x: -160, width: 320 }]);
});
