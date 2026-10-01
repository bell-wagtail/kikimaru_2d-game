import Phaser from "phaser";
import { groundSegments, mergeGroundHoles, validateGroundHoles } from "./ground";
import type { GroundHole } from "./ground";
import { PLAYER, WORLD } from "./movement";
import { REBASE_DISTANCE } from "./scrolling";
import { sideContacts } from "./obstacles";
import type { Bounds } from "./obstacles";
import { GROUND_APPEARANCE, pitTexture } from "./groundTextures";

export const GROUND = { respawnTop: WORLD.height } as const;

export class StageGround {
  readonly group: Phaser.Physics.Arcade.StaticGroup;
  private originX = 0;
  private readonly floors: { zone: Phaser.GameObjects.Zone; body: Phaser.Physics.Arcade.StaticBody }[] = [];
  private readonly openings: { definition: GroundHole; image: Phaser.GameObjects.Container }[] = [];
  private readonly holes: readonly GroundHole[];

  constructor(scene: Phaser.Scene, holes: readonly GroundHole[]) {
    validateGroundHoles(holes);
    this.holes = mergeGroundHoles(holes);
    this.group = scene.physics.add.staticGroup();
    for (let i = 0; i <= this.holes.length; i++) {
      const zone = scene.add.zone(0, WORLD.ground, 1, WORLD.height + PLAYER.height - WORLD.ground).setOrigin(0);
      this.group.add(zone);
      const body = zone.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.down = false;
      this.floors.push({ zone, body });
    }
    for (const definition of this.holes) {
      const image = this.makeOpening(scene, definition.width);
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

  contacts(player: Bounds): { left: boolean; right: boolean } {
    return sideContacts(player, this.floors.filter(({ body }) => body.enable).map(({ body }) => body));
  }

  private makeOpening(scene: Phaser.Scene, width: number): Phaser.GameObjects.Container {
    const { key, bankWidth, height } = pitTexture(scene.textures);
    const edgeWidth = Math.min(bankWidth, width / 2);
    const image = scene.add.container(0, WORLD.ground - GROUND_APPEARANCE.surfaceOffset).setSize(width, height);
    image.add(scene.add.image(0, 0, key, "pit-left").setOrigin(0).setDisplaySize(edgeWidth, height));
    const middleWidth = width - edgeWidth * 2;
    if (middleWidth > 0) image.add(scene.add.image(edgeWidth, 0, key, "pit-middle").setOrigin(0)
      .setDisplaySize(middleWidth, height));
    image.add(scene.add.image(width - edgeWidth, 0, key, "pit-right").setOrigin(0).setDisplaySize(edgeWidth, height));
    return image;
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
