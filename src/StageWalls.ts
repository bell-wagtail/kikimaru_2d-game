import Phaser from "phaser";
import { WORLD } from "./movement";
import { localWalls, wallContacts } from "./walls";
import type { WallDefinition } from "./walls";
import type { Bounds } from "./obstacles";

const WALL_APPEARANCE = { color: 0x9a856b, lineAlpha: 0.3, lineWidth: 2,
  dashLength: 10, dashGap: 16, postWidth: 12, postHeight: 88 } as const;

export class StageWalls {
  private originX = 0;
  private readonly marks: { x: number; image: Phaser.GameObjects.Container }[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly definition: WallDefinition = {}) {
    for (const side of ["left", "right"] as const) {
      const x = definition[side];
      if (x === undefined) continue;
      const sign = side === "left" ? 1 : -1;
      const graphics = scene.add.graphics();
      graphics.lineStyle(WALL_APPEARANCE.lineWidth, WALL_APPEARANCE.color, WALL_APPEARANCE.lineAlpha);
      for (let y = 0; y < WORLD.ground; y += WALL_APPEARANCE.dashLength + WALL_APPEARANCE.dashGap) {
        graphics.lineBetween(0, y, 0, Math.min(WORLD.ground, y + WALL_APPEARANCE.dashLength));
      }
      graphics.fillStyle(WALL_APPEARANCE.color, 0.75);
      graphics.fillRoundedRect(-WALL_APPEARANCE.postWidth, WORLD.ground - WALL_APPEARANCE.postHeight,
        WALL_APPEARANCE.postWidth, WALL_APPEARANCE.postHeight, 3);
      graphics.setScale(sign, 1);
      const label = scene.add.text(sign * 16, WORLD.ground - WALL_APPEARANCE.postHeight - 12, "ここまで", {
        fontFamily: '"Yu Gothic UI", "Meiryo", sans-serif', fontSize: "13px", color: "#796953",
        backgroundColor: "#fffdf2cc", padding: { x: 6, y: 3 }
      }).setOrigin(side === "left" ? 0 : 1, 1);
      const image = scene.add.container(x, 0, [graphics, label]);
      this.marks.push({ x, image });
    }
    this.place();
  }

  get limits(): WallDefinition { return localWalls(this.definition, this.originX); }

  contacts(player: Bounds): { left: boolean; right: boolean } { return wallContacts(player, this.limits); }

  rebase(shift: number): void { this.originX += shift; this.place(); }

  reset(): void { this.originX = 0; this.place(); }

  private place(): void {
    const { left, right } = this.limits;
    const x = left ?? (right === undefined ? 0 : right - WORLD.width);
    const width = right === undefined ? WORLD.width : right - x;
    // World side bounds cannot be jumped over and keep falling below the floor possible.
    this.scene.physics.world.setBounds(x, 0, width, WORLD.height, left !== undefined, right !== undefined, true, false);
    for (const { x, image } of this.marks) image.setX(x - this.originX);
  }
}
