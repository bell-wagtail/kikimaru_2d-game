import Phaser from "phaser";
import { sideContacts, validateObstacles } from "./obstacles";
import type { Bounds, ObstacleDefinition } from "./obstacles";
import { obstacleAsset } from "./stages";

export class FixedObstacles {
  readonly group: Phaser.Physics.Arcade.StaticGroup;
  private originX = 0;
  private readonly items: {
    definition: ObstacleDefinition;
    image: Phaser.GameObjects.Image;
    body: Phaser.Physics.Arcade.StaticBody;
  }[] = [];

  constructor(scene: Phaser.Scene, definitions: readonly ObstacleDefinition[]) {
    validateObstacles(definitions);
    this.group = scene.physics.add.staticGroup();
    for (const definition of definitions) {
      const image = scene.add.image(definition.x, definition.y, obstacleAsset(definition.kind).key)
        .setOrigin(0).setDisplaySize(definition.width, definition.height);
      this.group.add(image);
      const body = image.body as Phaser.Physics.Arcade.StaticBody;
      body.updateFromGameObject();
      this.items.push({ definition, image, body });
    }
  }

  contacts(player: Bounds): { left: boolean; right: boolean } {
    // Arcade clears contact flags each step, so a stopped body cannot rely on last frame's flags.
    return sideContacts(player, this.items.map(item => item.body));
  }

  rebase(shift: number): void {
    this.originX += shift;
    this.place();
  }

  reset(): void {
    this.originX = 0;
    this.place();
  }

  private place(): void {
    for (const { definition, body } of this.items) {
      // StaticBody.reset also reinserts the bounds into Arcade's static collision tree.
      body.reset(definition.x - this.originX, definition.y);
    }
  }
}
