import { ITEM_TYPES } from "./items.ts";
import type { ItemKind } from "./items.ts";

export const ITEM_FEEDBACK = {
  noticeSeconds: 2, warningSeconds: 3,
  normalPulseSeconds: 2.3, warningPulseSeconds: 0.4, urgentPulseSeconds: 0.3,
  minAlpha: 0.55, maxAlpha: 0.95,
  centerHeightRatio: 0.5, textureSize: 256,
  noticeY: 130, noticeFontSize: 34
} as const;

export function pulsePeriod(secondsLeft: number): number {
  if (secondsLeft > ITEM_FEEDBACK.warningSeconds) return ITEM_FEEDBACK.normalPulseSeconds;
  const remaining = Math.max(0, Math.min(1, secondsLeft / ITEM_FEEDBACK.warningSeconds));
  return ITEM_FEEDBACK.urgentPulseSeconds + (ITEM_FEEDBACK.warningPulseSeconds - ITEM_FEEDBACK.urgentPulseSeconds) * remaining;
}

export class ItemNoticeState {
  private readonly notices = new Map<ItemKind, { text: string; seconds: number }>();

  acquired(kind: ItemKind): void { this.show(kind, `${ITEM_TYPES[kind].name}を取得！`); }

  expired(kind: ItemKind): void { this.show(kind, `${ITEM_TYPES[kind].name}の効果が終了しました`); }

  private show(kind: ItemKind, text: string): void {
    this.notices.set(kind, { text, seconds: ITEM_FEEDBACK.noticeSeconds });
  }

  advance(deltaSeconds: number): void {
    for (const [kind, notice] of this.notices) {
      notice.seconds -= Math.max(0, deltaSeconds);
      if (notice.seconds <= 1e-9) this.notices.delete(kind);
    }
  }

  get text(): string { return [...this.notices.values()].map(notice => notice.text).join("\n"); }

  reset(): void { this.notices.clear(); }
}
