import { QUIZ_QUESTIONS } from "./quizData.ts";
import type { QuizQuestion } from "./quizData.ts";
import { SCORE_RULES } from "./score.ts";

export interface QuizView {
  readonly id: string;
  readonly prompt: string;
  readonly choices: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
}

export interface QuizResult {
  readonly correct: boolean;
  readonly correctAnswer: string;
  readonly points: number;
  readonly explanation: string;
}

export function drawQuiz(random: () => number = Math.random, questions: readonly QuizQuestion[] = QUIZ_QUESTIONS): QuizView {
  if (!questions.length) throw new Error("クイズの問題を1問以上登録してください");
  const question = questions[Math.floor(random() * questions.length)];
  const choices = question.choices.map((text, index) => ({ text, correct: index === question.correctIndex }));
  for (let index = choices.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [choices[index], choices[other]] = [choices[other], choices[index]];
  }
  return { id: question.id, prompt: question.prompt, choices: choices.map(choice => choice.text),
    correctIndex: choices.findIndex(choice => choice.correct), explanation: question.explanation };
}

export class QuizState {
  current: QuizView | undefined;
  result: QuizResult | undefined;
  private readonly questions: readonly QuizQuestion[];
  private readonly random: () => number;
  private remaining: readonly QuizQuestion[] = [];
  private lastQuestionId: string | undefined;

  constructor(questions: readonly QuizQuestion[] = QUIZ_QUESTIONS, random: () => number = Math.random) {
    if (!questions.length || new Set(questions.map(question => question.id)).size !== questions.length) {
      throw new Error("クイズは1問以上、重複しないIDで登録してください");
    }
    this.questions = [...questions];
    this.random = random;
  }

  begin(): QuizView | undefined {
    if (this.current) return undefined;
    if (!this.remaining.length) this.remaining = this.questions;
    const candidates = this.remaining.length === this.questions.length && this.questions.length > 1
      ? this.remaining.filter(question => question.id !== this.lastQuestionId) : this.remaining;
    const question = drawQuiz(this.random, candidates);
    this.current = question;
    this.remaining = this.remaining.filter(candidate => candidate.id !== question.id);
    this.lastQuestionId = question.id;
    return this.current;
  }

  answer(index: number): QuizResult | undefined {
    if (!this.current || this.result || !Number.isInteger(index) || index < 0 || index >= this.current.choices.length) return undefined;
    const correct = index === this.current.correctIndex;
    this.result = { correct, correctAnswer: this.current.choices[this.current.correctIndex],
      points: correct ? SCORE_RULES.quizCorrect : SCORE_RULES.quizIncorrect, explanation: this.current.explanation };
    return this.result;
  }

  finish(): boolean {
    if (!this.result) return false;
    this.current = undefined;
    this.result = undefined;
    return true;
  }

  reset(): void {
    this.current = undefined;
    this.result = undefined;
    this.remaining = [];
    this.lastQuestionId = undefined;
  }
}
