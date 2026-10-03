import type { StageTotals } from "./score.ts";

export interface PlayResult extends StageTotals {
  readonly score: number;
  readonly correctCount: number;
  readonly unansweredCount: number;
}

export class PlayResultState {
  current: Readonly<PlayResult> | undefined;
  private readonly totals: StageTotals;

  constructor(totals: StageTotals) { this.totals = totals; }

  finish(score: number, answeredCount: number, correctCount: number): Readonly<PlayResult> {
    return this.current ??= Object.freeze({ ...this.totals, score, correctCount,
      unansweredCount: Math.max(0, this.totals.quizCount - answeredCount) });
  }

  reset(): void { this.current = undefined; }
}
