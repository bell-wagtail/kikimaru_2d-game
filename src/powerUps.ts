import { ITEM_TYPES } from "./items.ts";
import type { ItemKind, PowerUpEffect } from "./items.ts";

export class PowerUpState {
  private readonly remaining = new Map<PowerUpEffect, number>();

  acquire(kind: ItemKind): void {
    const { effect, durationSeconds } = ITEM_TYPES[kind];
    this.remaining.set(effect, durationSeconds);
  }

  active(effect: PowerUpEffect): boolean { return this.secondsLeft(effect) > 0; }

  secondsLeft(effect: PowerUpEffect): number { return this.remaining.get(effect) ?? 0; }

  advance(deltaSeconds: number): void {
    for (const [effect, seconds] of this.remaining) {
      const next = Math.max(0, seconds - Math.max(0, deltaSeconds));
      if (next <= 1e-9) this.remaining.delete(effect);
      else this.remaining.set(effect, next);
    }
  }

  reset(): void { this.remaining.clear(); }
}
