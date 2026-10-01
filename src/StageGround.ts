import Phaser from "phaser";
import { groundSegments, validateGroundHoles } from "./ground";
import type { GroundHole } from "./ground";
import { PLAYER, WORLD } from "./movement";
import { REBASE_DISTANCE } from "./scrolling";

export const GROUND = { holeColor: 0x111016, respawnTop: WORLD.height } as const;

export class StageGround {
  readonly group: Phaser.Physics.Arcade.StaticGroup;
  private originX = 0;
  private readonly floors: { zone: Phaser.GameObjects.Zone; body: Phaser.Physics.Arcade.StaticBody }[] = [];
  private readonly openings: { definition: GroundHole; image: Phaser.GameObjects.Rectangle }[] = [];

  constructor(scene: Phaser.Scene, private readonly holes: readonly GroundHole[]) {
    validateGroundHoles(holes);
    this.group = scene.physics.add.staticGroup();
    for (let i = 0; i <= holes.length; i++) {
      const zone = scene.add.zone(0, WORLD.ground, 1, WORLD.height + PLAYER.height - WORLD.ground).setOrigin(0);
      this.group.add(zone);
      const body = zone.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.left = body.checkCollision.right = body.checkCollision.down = false;
      this.floors.push({ zone, body });
    }
    for (const definition of holes) {
      const image = scene.add.rectangle(0, WORLD.ground - 3, definition.width, WORLD.height - WORLD.ground + 3, GROUND.holeColor).setOrigin(0);
      this.openings.push({ definition, image });
    }
    this.place();
  }

  rebase(shift: number): void { this.originX += shift; this.place(); }

  reset(): void { this.originX = 0; this.place(); }

  hasFloorAt(localX: number): boolean {
    const x = localX + this.originX;
    return !this.holes.some(hole => x >= hole.x && x < hole.x + hole.width);
  }

  private place(): void {
    // Reuse a bounded pool instead of creating floor objects as the player travels.
    const left = WORLD.width / 2 - REBASE_DISTANCE * 2;
    const right = WORLD.width / 2 + REBASE_DISTANCE * 2;
    const segments = groundSegments(left + this.originX, right + this.originX, this.holes);
    this.floors.forEach(({ zone, body }, index) => {
      const segment = segments[index];
      body.enable = Boolean(segment);
      if (!segment) return;
      zone.setPosition(segment.left - this.originX, WORLD.ground).setSize(segment.right - segment.left, zone.height);
      // Updating the static body also updates Arcade's collision search tree.
      body.updateFromGameObject();
    });
    for (const { definition, image } of this.openings) image.setX(definition.x - this.originX);
  }
}
