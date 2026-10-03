import { ITEM_TYPES, isPowerUpKind } from "./items.ts";
import type { ItemDefinition, ItemKind, ScoreItemKind } from "./items.ts";

export const SCORE_RULES = {
  initial: 0, minimum: 0,
  powerUpItem: 10,
  items: { fish: 50, mandarin: 20, strawberry: 30 } satisfies Record<ScoreItemKind, number>,
  quizCorrect: 100, quizIncorrect: -30
} as const;

export function itemPoints(kind: ItemKind): number {
  if (isPowerUpKind(kind)) return SCORE_RULES.powerUpItem;
  if (ITEM_TYPES[kind].type === "score") return SCORE_RULES.items[kind as ScoreItemKind];
  return 0;
}

export class ScoreState {
  private points: number = SCORE_RULES.initial;
  readonly maximum: number;

  constructor(maximum: number) {
    this.maximum = maximum;
    if (!Number.isFinite(maximum) || maximum < Math.max(SCORE_RULES.initial, SCORE_RULES.minimum)) {
      throw new Error("ステージのスコア上限が不正です");
    }
  }

  get value(): number { return this.points; }

  change(points: number): number {
    const before = this.points;
    this.points = Math.max(SCORE_RULES.minimum, Math.min(this.maximum, before + points));
    return this.points - before;
  }

  reset(): void { this.points = SCORE_RULES.initial; }
}

export interface StageTotals { readonly maximumScore: number; readonly quizCount: number }

export function stageTotals(items: readonly ItemDefinition[]): StageTotals {
  return items.reduce<StageTotals>((total, item) => ({
    maximumScore: total.maximumScore + (ITEM_TYPES[item.kind].type === "quiz" ? SCORE_RULES.quizCorrect : itemPoints(item.kind)),
    quizCount: total.quizCount + Number(ITEM_TYPES[item.kind].type === "quiz")
  }), { maximumScore: 0, quizCount: 0 });
}
