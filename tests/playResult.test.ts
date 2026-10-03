import { test } from "node:test";
import assert from "node:assert/strict";
import { PlayResultState } from "../src/playResult.ts";
import { QuizState } from "../src/quiz.ts";

test("the goal snapshots score and counts once, including wrong and unanswered questions", () => {
  const state = new PlayResultState({ maximumScore: 1400, quizCount: 12 });
  const result = state.finish(1270, 11, 10);
  assert.deepEqual(result, { maximumScore: 1400, quizCount: 12, score: 1270, correctCount: 10, unansweredCount: 1 });
  assert.equal(state.finish(1400, 12, 12), result);
  assert.ok(Object.isFrozen(result));
  state.reset();
  assert.notEqual(state.finish(0, 0, 0), result);
  assert.equal(state.current?.unansweredCount, 12);
});

test("empty-map results show finite zero counts", () => {
  assert.deepEqual(new PlayResultState({ maximumScore: 0, quizCount: 0 }).finish(0, 0, 0),
    { maximumScore: 0, quizCount: 0, score: 0, correctCount: 0, unansweredCount: 0 });
});

test("quiz statistics count each valid answer once and reset with its question history", () => {
  const quiz = new QuizState();
  const correct = quiz.begin()!.correctIndex;
  assert.equal(quiz.answer(-1), undefined);
  quiz.answer(correct); quiz.answer(correct);
  assert.equal(quiz.answeredCount, 1); assert.equal(quiz.correctCount, 1);
  quiz.finish();
  quiz.answer(0);
  const next = quiz.begin()!.correctIndex;
  quiz.answer((next + 1) % 4); quiz.finish();
  assert.equal(quiz.answeredCount, 2); assert.equal(quiz.correctCount, 1);
  quiz.reset();
  assert.equal(quiz.answeredCount, 0); assert.equal(quiz.correctCount, 0);
});
