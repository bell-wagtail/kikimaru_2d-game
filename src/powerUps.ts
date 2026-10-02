import { ITEM_TYPES } from "./items.ts";
import type { ItemKind, PowerUpEffect } from "./items.ts";

export class PowerUpState {
  private readonly remaining = new Map<PowerUpEffect, { kind: ItemKind; seconds: number }>();

  acquire(kind: ItemKind): void {
    const { effect, durationSeconds } = ITEM_TYPES[kind];
    this.remaining.set(effect, { kind, seconds: durationSeconds });
  }

  active(effect: PowerUpEffect): boolean { return this.secondsLeft(effect) > 0; }

  secondsLeft(effect: PowerUpEffect): number { return this.remaining.get(effect)?.seconds ?? 0; }

  activeItems(): ItemKind[] { return [...this.remaining.values()].map(item => item.kind); }

  advance(deltaSeconds: number): ItemKind[] {
    const expired: ItemKind[] = [];
    for (const [effect, item] of this.remaining) {
      item.seconds = Math.max(0, item.seconds - Math.max(0, deltaSeconds));
      if (item.seconds <= 1e-9) {
        this.remaining.delete(effect);
        expired.push(item.kind);
      }
    }
    return expired;
  }

  reset(): void { this.remaining.clear(); }
}
