import { test } from "node:test";
import assert from "node:assert/strict";
import { SCORE_RULES, ScoreState, itemPoints, stageTotals } from "../src/score.ts";

test("power items share a reward, fish and fruits have individual rewards and quiz contact has no reward", () => {
  assert.equal(itemPoints("tea"), 10);
  assert.equal(itemPoints("shrimp"), 10);
  assert.equal(itemPoints("fish"), 50);
  assert.equal(itemPoints("mandarin"), 20);
  assert.equal(itemPoints("strawberry"), 30);
  assert.equal(itemPoints("quiz"), 0);
});

test("score clamps every positive and negative award and reports the actual change", () => {
  const score = new ScoreState(1500);
  assert.equal(score.value, 0);
  assert.equal(score.change(SCORE_RULES.quizIncorrect), 0);
  score.change(20);
  assert.equal(score.change(SCORE_RULES.quizIncorrect), -20);
  assert.equal(score.value, SCORE_RULES.minimum);
  score.change(score.maximum - 10);
  assert.equal(score.change(SCORE_RULES.quizCorrect), 10);
  assert.equal(score.value, score.maximum);
  assert.equal(score.change(itemPoints("fish")), 0);
  assert.equal(score.change(itemPoints("mandarin")), 0);
  assert.equal(score.change(itemPoints("strawberry")), 0);
  assert.equal(score.change(-2000), -score.maximum);
  assert.equal(score.value, SCORE_RULES.minimum);
});

test("reset starts a fresh score after either rewards or penalties", () => {
  const score = new ScoreState(200);
  score.change(itemPoints("fish")); score.change(SCORE_RULES.quizIncorrect);
  score.reset(); assert.equal(score.value, SCORE_RULES.initial);
});

test("stage totals count every occurrence including repeated rewards and more than two quiz cycles", () => {
  const kinds = ["tea", "shrimp", "fish", "fish", "mandarin", "strawberry", ...Array(25).fill("quiz")] as const;
  const items = kinds.map((kind, index) => ({ id: `item-${index}`, kind, x: index * 60, y: 510, width: 60, height: 40 }));
  const totals = stageTotals(items);
  assert.equal(totals.quizCount, 25);
  assert.equal(totals.maximumScore, kinds.reduce((sum, kind) => sum + (kind === "quiz" ? SCORE_RULES.quizCorrect : itemPoints(kind)), 0));
  assert.ok(totals.maximumScore > 1000);
  const score = new ScoreState(totals.maximumScore);
  for (const kind of kinds) score.change(kind === "quiz" ? SCORE_RULES.quizCorrect : itemPoints(kind));
  assert.equal(score.value, totals.maximumScore);
});

test("an empty stage has zero total without percentages or an invalid score range", () => {
  assert.deepEqual(stageTotals([]), { maximumScore: 0, quizCount: 0 });
  const score = new ScoreState(0);
  assert.equal(score.change(SCORE_RULES.quizIncorrect), 0);
  assert.equal(score.value, 0);
  for (const maximum of [-1, NaN, Infinity]) assert.throws(() => new ScoreState(maximum));
});
