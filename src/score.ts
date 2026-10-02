import { ITEM_TYPES, isPowerUpKind } from "./items.ts";
import type { ItemKind, ScoreItemKind } from "./items.ts";

export const SCORE_RULES = {
  initial: 0, minimum: 0, maximum: 1000,
  powerUpItem: 10,
  items: { fish: 50 } satisfies Record<ScoreItemKind, number>,
  quizCorrect: 100, quizIncorrect: -30
} as const;

export function itemPoints(kind: ItemKind): number {
  if (isPowerUpKind(kind)) return SCORE_RULES.powerUpItem;
  if (ITEM_TYPES[kind].type === "score") return SCORE_RULES.items[kind as ScoreItemKind];
  return 0;
}

export class ScoreState {
  private points: number = SCORE_RULES.initial;

  get value(): number { return this.points; }

  change(points: number): number {
    const before = this.points;
    this.points = Math.max(SCORE_RULES.minimum, Math.min(SCORE_RULES.maximum, before + points));
    return this.points - before;
  }

  reset(): void { this.points = SCORE_RULES.initial; }
}
