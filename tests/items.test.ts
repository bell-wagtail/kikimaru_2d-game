import { test } from "node:test";
import assert from "node:assert/strict";
import { ITEM_TYPES, POWER_UP_KINDS, isPowerUpKind, itemKindForSymbol, validateItems } from "../src/items.ts";
import { PowerUpState } from "../src/powerUps.ts";

test("item definitions uniquely associate map symbols, assets, effects and positive durations", () => {
  const definitions = Object.values(ITEM_TYPES);
  assert.equal(new Set(definitions.map(item => item.symbol)).size, definitions.length);
  assert.ok(definitions.every(item => item.symbol.length === 1 && ![".", " ", "=", "x"].includes(item.symbol)));
  assert.ok(POWER_UP_KINDS.every(kind => Number.isFinite(ITEM_TYPES[kind].durationSeconds) && ITEM_TYPES[kind].durationSeconds > 0));
  assert.equal(itemKindForSymbol("o"), "tea"); assert.equal(itemKindForSymbol("j"), "shrimp");
  assert.equal(itemKindForSymbol("?"), undefined);
  assert.equal(ITEM_TYPES.tea.assetKey, "props/tea"); assert.equal(ITEM_TYPES.shrimp.effect, "doubleJump");
  assert.equal(itemKindForSymbol("F"), "fish"); assert.equal(itemKindForSymbol("Q"), "quiz");
  assert.equal(ITEM_TYPES.fish.assetKey, "props/fish"); assert.equal(ITEM_TYPES.quiz.assetKey, "props/quiz_marker");
  assert.equal(itemKindForSymbol("M"), "mandarin"); assert.equal(itemKindForSymbol("S"), "strawberry");
  assert.equal(ITEM_TYPES.mandarin.assetKey, "props/mandarin"); assert.equal(ITEM_TYPES.strawberry.assetKey, "props/strawberry");
  assert.equal(isPowerUpKind("mandarin"), false); assert.equal(isPowerUpKind("strawberry"), false);
  assert.equal(isPowerUpKind("fish"), false); assert.equal(isPowerUpKind("quiz"), false);
});

test("item geometry accepts both kinds and rejects duplicate IDs, unknown kinds and invalid sizes", () => {
  const tea = { id: "tea", kind: "tea", x: -60, y: 406, width: 60, height: 36 } as const;
  const shrimp = { ...tea, id: "shrimp", kind: "shrimp" } as const;
  assert.doesNotThrow(() => validateItems([tea, shrimp]));
  assert.throws(() => validateItems([tea, tea]));
  assert.throws(() => validateItems([{ ...tea, kind: "toString" as "tea" }]));
  for (const invalid of [{ width: 0 }, { height: -1 }, { x: Infinity }, { y: NaN }]) {
    assert.throws(() => validateItems([{ ...shrimp, ...invalid }]));
  }
});

test("power timers coexist and expire independently after their configured game time", () => {
  const powers = new PowerUpState();
  const stagger = Math.min(ITEM_TYPES.tea.durationSeconds, ITEM_TYPES.shrimp.durationSeconds) / 3;
  powers.acquire("tea"); powers.acquire("shrimp"); powers.advance(stagger); powers.acquire("shrimp");
  powers.advance(ITEM_TYPES.tea.durationSeconds - stagger);
  assert.equal(powers.active("autoDash"), false);
  const shrimpRemaining = Math.max(0, ITEM_TYPES.shrimp.durationSeconds - ITEM_TYPES.tea.durationSeconds + stagger);
  assert.ok(Math.abs(powers.secondsLeft("doubleJump") - shrimpRemaining) < 1e-8);
  powers.advance(shrimpRemaining); assert.equal(powers.active("doubleJump"), false);
});

test("reacquisition refreshes only that timer without stacking duration", () => {
  const elapsed = Math.min(ITEM_TYPES.tea.durationSeconds, ITEM_TYPES.shrimp.durationSeconds) / 2;
  const powers = new PowerUpState(); powers.acquire("tea"); powers.acquire("shrimp"); powers.advance(elapsed);
  powers.acquire("tea");
  assert.equal(powers.secondsLeft("autoDash"), ITEM_TYPES.tea.durationSeconds);
  assert.equal(powers.secondsLeft("doubleJump"), ITEM_TYPES.shrimp.durationSeconds - elapsed);
  powers.advance(ITEM_TYPES.tea.durationSeconds); assert.equal(powers.active("autoDash"), false);
});

test("timer expiry is stable across frame rates, long deltas and reset", () => {
  for (const fps of [30, 60, 144]) {
    const powers = new PowerUpState(); powers.acquire("tea");
    for (let i = 0; i < ITEM_TYPES.tea.durationSeconds * fps; i++) powers.advance(1 / fps);
    assert.equal(powers.active("autoDash"), false);
  }
  const powers = new PowerUpState(); powers.acquire("shrimp"); powers.advance(-1);
  assert.equal(powers.secondsLeft("doubleJump"), ITEM_TYPES.shrimp.durationSeconds);
  powers.advance(100); assert.equal(powers.active("doubleJump"), false);
  powers.acquire("tea"); powers.acquire("shrimp"); powers.reset();
  assert.equal(powers.active("autoDash"), false); assert.equal(powers.active("doubleJump"), false);
});
