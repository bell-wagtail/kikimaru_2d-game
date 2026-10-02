import { QUIZ_QUESTIONS } from "./quizData.ts";
import { SCORE_RULES } from "./score.ts";

export interface QuizView {
  readonly id: string;
  readonly prompt: string;
  readonly choices: readonly string[];
  readonly correctIndex: number;
}

export interface QuizResult {
  readonly correct: boolean;
  readonly correctAnswer: string;
  readonly points: number;
}

export function drawQuiz(random: () => number = Math.random): QuizView {
  const question = QUIZ_QUESTIONS[Math.floor(random() * QUIZ_QUESTIONS.length)];
  const choices = question.choices.map((text, index) => ({ text, correct: index === question.correctIndex }));
  for (let index = choices.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [choices[index], choices[other]] = [choices[other], choices[index]];
  }
  return { id: question.id, prompt: question.prompt, choices: choices.map(choice => choice.text),
    correctIndex: choices.findIndex(choice => choice.correct) };
}

export class QuizState {
  current: QuizView | undefined;
  result: QuizResult | undefined;

  begin(): QuizView | undefined {
    if (this.current) return undefined;
    this.current = drawQuiz();
    return this.current;
  }

  answer(index: number): QuizResult | undefined {
    if (!this.current || this.result || !Number.isInteger(index) || index < 0 || index >= this.current.choices.length) return undefined;
    const correct = index === this.current.correctIndex;
    this.result = { correct, correctAnswer: this.current.choices[this.current.correctIndex],
      points: correct ? SCORE_RULES.quizCorrect : SCORE_RULES.quizIncorrect };
    return this.result;
  }

  finish(): boolean {
    if (!this.result) return false;
    this.reset();
    return true;
  }

  reset(): void { this.current = undefined; this.result = undefined; }
}
