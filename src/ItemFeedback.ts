import type Phaser from "phaser";
import { ITEM_TYPES, POWER_UP_KINDS } from "./items";
import type { ItemKind, PowerUpKind } from "./items";
import { ITEM_FEEDBACK, ItemNoticeState, pulsePeriod } from "./feedback";
import type { PowerUpState } from "./powerUps";

export interface FeedbackAnchor {
  readonly x: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

export class ItemFeedback {
  private readonly notices = new ItemNoticeState();
  private readonly message: Phaser.GameObjects.Text;
  private readonly glows: { kind: PowerUpKind; image: Phaser.GameObjects.Image; phase: number }[] = [];

  constructor(scene: Phaser.Scene) {
    for (const kind of POWER_UP_KINDS) {
      const { color } = ITEM_TYPES[kind].glow;
      const key = `item-glow-${color}`;
      if (!scene.textures.exists(key)) {
        const size = ITEM_FEEDBACK.textureSize;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const context = canvas.getContext("2d")!;
        const radius = size / 2;
        const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius);
        gradient.addColorStop(0, `${color}00`);
        gradient.addColorStop(0.65, `${color}00`);
        gradient.addColorStop(0.8, color);
        gradient.addColorStop(1, `${color}00`);
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        scene.textures.addCanvas(key, canvas);
      }
      const image = scene.add.image(0, 0, key).setVisible(false);
      this.glows.push({ kind, image, phase: 0 });
    }
    this.message = scene.add.text(scene.cameras.main.width / 2, ITEM_FEEDBACK.noticeY, "", {
      fontFamily: '"Yu Gothic UI", "Meiryo", sans-serif',
      fontSize: `${ITEM_FEEDBACK.noticeFontSize}px`, fontStyle: "bold", color: "#493c53",
      backgroundColor: "#fffaf2", padding: { x: 18, y: 8 }, align: "center"
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10).setVisible(false);
  }

  advance(deltaSeconds: number): void { this.notices.advance(deltaSeconds); }

  notify(acquired: readonly ItemKind[], expired: readonly ItemKind[]): void {
    for (const kind of expired) this.notices.expired(kind);
    for (const kind of acquired) {
      this.notices.acquired(kind);
      const glow = this.glows.find(item => item.kind === kind);
      if (glow) glow.phase = 0;
    }
  }

  update(anchor: FeedbackAnchor, powerUps: PowerUpState, deltaSeconds: number): void {
    const active = new Set(powerUps.activeItems());
    for (const glow of this.glows) {
      const definition = ITEM_TYPES[glow.kind];
      const seconds = powerUps.secondsLeft(definition.effect);
      glow.image.setVisible(active.has(glow.kind));
      if (!glow.image.visible) continue;
      glow.phase = (glow.phase + Math.max(0, deltaSeconds) / pulsePeriod(seconds)) % 1;
      const wave = (1 + Math.cos(glow.phase * Math.PI * 2)) / 2;
      const diameter = Math.max(anchor.width, anchor.height) * definition.glow.diameterScale;
      glow.image.setPosition(anchor.x, anchor.bottom - anchor.height * ITEM_FEEDBACK.centerHeightRatio)
        .setDisplaySize(diameter, diameter)
        .setAlpha(ITEM_FEEDBACK.minAlpha + (ITEM_FEEDBACK.maxAlpha - ITEM_FEEDBACK.minAlpha) * wave);
    }
    const text = this.notices.text;
    if (this.message.text !== text) this.message.setText(text);
    this.message.setVisible(text.length > 0);
  }

  reset(): void {
    this.notices.reset();
    this.message.setText("").setVisible(false);
    for (const glow of this.glows) { glow.phase = 0; glow.image.setVisible(false); }
  }
}
