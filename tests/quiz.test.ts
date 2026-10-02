import { test } from "node:test";
import assert from "node:assert/strict";
import { QUIZ_QUESTIONS } from "../src/quizData.ts";
import { drawQuiz, QuizState } from "../src/quiz.ts";
import { SCORE_RULES } from "../src/score.ts";

test("registered questions have distinct IDs and choices, including the three requested local facts", () => {
  const requested = [
    ["「やくなし」の語呂合わせで知られる、蓬莱橋の長さは？", "897.4m"],
    ["夢のつり橋がある渓谷は？", "寸又峡"], ["島田で3年に一度開かれる伝統のお祭りは？", "帯まつり（島田大祭）"]
  ];
  for (const [prompt, answer] of requested) {
    const question = QUIZ_QUESTIONS.find(question => question.prompt === prompt)!;
    assert.ok(question);
    assert.equal(question.choices[question.correctIndex], answer);
  }
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
      assert.equal(view.explanation, question.explanation);
      assert.deepEqual([...view.choices].sort(), [...question.choices].sort());
      assert.equal(view.choices[view.correctIndex], question.choices[question.correctIndex]);
      orders.add(JSON.stringify(view.choices));
    }
    assert.equal(orders.size, 24);
  });
  assert.equal(JSON.stringify(QUIZ_QUESTIONS), before);
});

test("numeric options have matching formats and every question supplies a single sourced fact", () => {
  const bridge = QUIZ_QUESTIONS.find(question => question.id === "horai-bridge")!;
  assert.ok(bridge.prompt.includes("やくなし"));
  assert.ok(bridge.choices.every(choice => /^\d{3}\.\dm$/.test(choice)));
  assert.deepEqual(new Set(bridge.choices.map(choice => choice.length)), new Set([bridge.choices[0].length]));
  for (const question of QUIZ_QUESTIONS) {
    assert.ok(question.explanation.length > 0 && question.explanation.endsWith("。"));
    assert.equal(question.explanation.split("。").length, 2);
    const source = new URL(question.sourceUrl);
    assert.equal(source.protocol, "https:");
    assert.ok(["www.city.shimada.shizuoka.jp", "okuooi.gr.jp"].includes(source.hostname));
  }
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
  assert.equal(result.explanation, view.explanation);
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
  assert.equal(result.explanation, view.explanation);
  quiz.reset();
  assert.equal(quiz.answer(0), undefined);
  assert.equal(quiz.finish(), false);
  assert.ok(quiz.begin());
  quiz.reset();
  assert.equal(quiz.current, undefined);
});

test("each cycle uses every question once for single, current and expanded question sets", () => {
  for (const count of [1, 2, QUIZ_QUESTIONS.length, 7, 20]) {
    const questions = Array.from({ length: count }, (_, index) => ({ ...QUIZ_QUESTIONS[0], id: `question-${index}`,
      prompt: `Question ${index}`, explanation: `Fact ${index}` }));
    const before = JSON.stringify(questions);
    let seed = 73;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
    const quiz = new QuizState(questions, random);
    let previousId: string | undefined;
    for (let cycle = 0; cycle < 5; cycle++) {
      const ids: string[] = [];
      for (let index = 0; index < count; index++) {
        const view = quiz.begin()!;
        assert.equal(quiz.begin(), undefined);
        assert.equal(quiz.finish(), false);
        if (count > 1) assert.notEqual(view.id, previousId);
        const question = questions.find(question => question.id === view.id)!;
        assert.equal(view.prompt, question.prompt);
        assert.equal(view.explanation, question.explanation);
        assert.equal(view.choices[view.correctIndex], question.choices[question.correctIndex]);
        ids.push(view.id);
        previousId = view.id;
        const correct = index % 2 === 0;
        assert.equal(quiz.answer(correct ? view.correctIndex : (view.correctIndex + 1) % 4)!.correct, correct);
        assert.equal(quiz.finish(), true);
      }
      assert.deepEqual(ids.sort(), questions.map(question => question.id).sort());
    }
    assert.equal(JSON.stringify(questions), before);
  }
});

test("a three-question pool can produce all six orders in its first cycle", () => {
  const questions = QUIZ_QUESTIONS.slice(0, 3);
  const orders = new Set<string>();
  for (let first = 0; first < 3; first++) for (let second = 0; second < 2; second++) {
    const samples = [(first + 0.5) / 3, 0, 0, 0, (second + 0.5) / 2, 0, 0, 0, 0.5, 0, 0, 0];
    const quiz = new QuizState(questions, () => samples.shift()!);
    const ids = [];
    for (let index = 0; index < questions.length; index++) {
      const view = quiz.begin()!;
      ids.push(view.id);
      quiz.answer(view.correctIndex);
      quiz.finish();
    }
    orders.add(JSON.stringify(ids));
    assert.equal(samples.length, 0);
  }
  assert.equal(orders.size, 6);
});

test("stage reset clears question history for unanswered, answered and finished quizzes", () => {
  for (const state of ["unanswered", "answered", "finished"]) {
    const quiz = new QuizState(QUIZ_QUESTIONS, () => 0);
    const first = quiz.begin()!;
    quiz.answer(first.correctIndex);
    quiz.finish();
    const second = quiz.begin()!;
    assert.notEqual(second.id, first.id);
    if (state !== "unanswered") quiz.answer(second.correctIndex);
    if (state === "finished") quiz.finish();
    quiz.reset();
    assert.equal(quiz.current, undefined);
    assert.equal(quiz.result, undefined);
    assert.equal(quiz.begin()!.id, first.id);
  }
});

test("question history belongs to each stage state rather than a shared global pool", () => {
  const firstStage = new QuizState(QUIZ_QUESTIONS, () => 0);
  const secondStage = new QuizState(QUIZ_QUESTIONS, () => 0);
  const first = firstStage.begin()!;
  firstStage.answer(first.correctIndex);
  firstStage.finish();
  assert.notEqual(firstStage.begin()!.id, first.id);
  assert.equal(secondStage.begin()!.id, first.id);
});

test("question pools reject empty data and duplicate IDs", () => {
  assert.throws(() => new QuizState([]), /1問以上/);
  assert.throws(() => new QuizState([QUIZ_QUESTIONS[0], QUIZ_QUESTIONS[0]]), /重複しないID/);
  assert.throws(() => drawQuiz(() => 0, []), /1問以上/);
});
