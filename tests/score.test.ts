import { test } from "node:test";
import assert from "node:assert/strict";
import { SCORE_RULES, ScoreState, itemPoints } from "../src/score.ts";

test("power items share a reward, fish and fruits have individual rewards and quiz contact has no reward", () => {
  assert.equal(itemPoints("tea"), 10);
  assert.equal(itemPoints("shrimp"), 10);
  assert.equal(itemPoints("fish"), 50);
  assert.equal(itemPoints("mandarin"), 20);
  assert.equal(itemPoints("strawberry"), 30);
  assert.equal(itemPoints("quiz"), 0);
});

test("score clamps every positive and negative award and reports the actual change", () => {
  const score = new ScoreState();
  assert.equal(score.value, 0);
  assert.equal(score.change(SCORE_RULES.quizIncorrect), 0);
  score.change(20);
  assert.equal(score.change(SCORE_RULES.quizIncorrect), -20);
  assert.equal(score.value, SCORE_RULES.minimum);
  score.change(SCORE_RULES.maximum - 10);
  assert.equal(score.change(SCORE_RULES.quizCorrect), 10);
  assert.equal(score.value, SCORE_RULES.maximum);
  assert.equal(score.change(itemPoints("fish")), 0);
  assert.equal(score.change(itemPoints("mandarin")), 0);
  assert.equal(score.change(itemPoints("strawberry")), 0);
  assert.equal(score.change(-2000), -SCORE_RULES.maximum);
  assert.equal(score.value, SCORE_RULES.minimum);
});

test("reset starts a fresh score after either rewards or penalties", () => {
  const score = new ScoreState();
  score.change(itemPoints("fish")); score.change(SCORE_RULES.quizIncorrect);
  score.reset(); assert.equal(score.value, SCORE_RULES.initial);
});
