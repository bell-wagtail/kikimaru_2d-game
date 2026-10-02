import { test } from "node:test";
import assert from "node:assert/strict";
import { QUIZ_QUESTIONS } from "../src/quizData.ts";
import { drawQuiz, QuizState } from "../src/quiz.ts";
import { SCORE_RULES } from "../src/score.ts";

test("the three requested questions each have four distinct choices and a valid correct answer", () => {
  assert.deepEqual(QUIZ_QUESTIONS.map(question => [question.prompt, question.choices[question.correctIndex]]), [
    ["蓬莱橋の長さは？", "897.4m"], ["夢のつり橋があるのは？", "寸又峡"], ["島田で3年に一度の大祭といえば？", "帯祭り"]
  ]);
  assert.equal(new Set(QUIZ_QUESTIONS.map(question => question.id)).size, QUIZ_QUESTIONS.length);
  for (const question of QUIZ_QUESTIONS) {
    assert.equal(new Set(question.choices).size, 4);
    assert.ok(Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex < 4);
  }
});

test("every question can be drawn with all 24 choice orders while its correct answer stays attached", () => {
  const before = JSON.stringify(QUIZ_QUESTIONS);
  QUIZ_QUESTIONS.forEach((question, questionIndex) => {
    const orders = new Set<string>();
    for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 2; c++) {
      const samples = [(questionIndex + 0.5) / QUIZ_QUESTIONS.length, (a + 0.5) / 4, (b + 0.5) / 3, (c + 0.5) / 2];
      const view = drawQuiz(() => samples.shift()!);
      assert.equal(view.id, question.id);
      assert.deepEqual([...view.choices].sort(), [...question.choices].sort());
      assert.equal(view.choices[view.correctIndex], question.choices[question.correctIndex]);
      orders.add(JSON.stringify(view.choices));
    }
    assert.equal(orders.size, 24);
  });
  assert.equal(JSON.stringify(QUIZ_QUESTIONS), before);
});

test("quiz cannot be replaced or dismissed unanswered and rejects invalid and duplicate answers", () => {
  const quiz = new QuizState();
  assert.equal(quiz.answer(0), undefined);
  const view = quiz.begin()!;
  assert.equal(quiz.begin(), undefined);
  assert.equal(quiz.finish(), false);
  assert.equal(quiz.current, view);
  for (const index of [-1, 4, 0.5, NaN]) assert.equal(quiz.answer(index), undefined);
  const result = quiz.answer(view.correctIndex)!;
  assert.equal(result.correct, true);
  assert.equal(result.points, SCORE_RULES.quizCorrect);
  assert.equal(result.correctAnswer, view.choices[view.correctIndex]);
  assert.equal(quiz.answer(view.correctIndex), undefined);
  assert.equal(quiz.finish(), true);
  assert.equal(quiz.current, undefined);
  assert.equal(quiz.result, undefined);
});

test("incorrect answers use the penalty and reset removes an active or answered quiz", () => {
  const quiz = new QuizState();
  const view = quiz.begin()!;
  const result = quiz.answer((view.correctIndex + 1) % 4)!;
  assert.equal(result.correct, false);
  assert.equal(result.points, SCORE_RULES.quizIncorrect);
  assert.equal(result.correctAnswer, view.choices[view.correctIndex]);
  quiz.reset();
  assert.equal(quiz.answer(0), undefined);
  assert.equal(quiz.finish(), false);
  assert.ok(quiz.begin());
  quiz.reset();
  assert.equal(quiz.current, undefined);
});
