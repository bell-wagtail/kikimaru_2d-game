import type Phaser from "phaser";
import { PLAYER } from "./movement";
import { DASH_FEEDBACK } from "./dashFeedback";

interface SpeedLineAnchor {
  readonly x: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

export class SpeedLines {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private phase = 0;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setVisible(false);
  }

  update(anchor: SpeedLineAnchor, velocityX: number, deltaSeconds: number): void {
    const range = PLAYER.speed * PLAYER.dashMultiplier - PLAYER.speed;
    const strength = range > 0 ? Math.min(1, Math.max(0, (Math.abs(velocityX) - PLAYER.speed) / range)) : 0;
    if (strength <= 1e-9) { this.reset(); return; }
    const style = DASH_FEEDBACK;
    const cycle = style.slowCycleSeconds + (style.fastCycleSeconds - style.slowCycleSeconds) * strength;
    this.phase = (this.phase + Math.max(0, deltaSeconds) / cycle) % 1;
    const length = anchor.height * (style.minLengthRatio + (style.maxLengthRatio - style.minLengthRatio) * strength);
    const count = Math.max(1, Math.ceil(strength * style.rows.length - 1e-9));
    const color = Number.parseInt(style.color.slice(1), 16);
    const outline = Number.parseInt(style.outlineColor.slice(1), 16);
    this.graphics.clear().setVisible(true).setPosition(anchor.x, anchor.bottom)
      .setScale(Math.sign(velocityX), 1)
      .setAlpha(style.minAlpha + (style.maxAlpha - style.minAlpha) * strength);
    for (const row of style.rows.slice(0, count)) {
      const phase = (this.phase + row.phase) % 1;
      const alpha = 0.45 + Math.sin(phase * Math.PI) * 0.55;
      const tip = -anchor.width / 2 - anchor.height * (style.gapRatio + row.offsetRatio + style.travelRatio * phase);
      const y = -anchor.height * row.heightRatio;
      const width = length * row.lengthScale;
      this.graphics.fillStyle(outline, alpha * style.outlineAlpha)
        .fillRoundedRect(tip - width - 1, y - style.thickness / 2 - 1, width + 2, style.thickness + 2, (style.thickness + 2) / 2);
      this.graphics.fillStyle(color, alpha)
        .fillRoundedRect(tip - width, y - style.thickness / 2, width, style.thickness, style.thickness / 2);
    }
  }

  reset(): void { this.phase = 0; this.graphics.clear().setVisible(false); }
}
