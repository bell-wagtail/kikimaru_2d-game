import type Phaser from "phaser";
import { ITEM_TYPES, validateItems } from "./items";
import type { ItemDefinition, ItemKind } from "./items";
import type { Bounds } from "./obstacles";
import { itemAsset } from "./stages";

export class StageItems {
  private originX = 0;
  private readonly items: { definition: ItemDefinition; image: Phaser.GameObjects.Image; collected: boolean }[] = [];

  constructor(scene: Phaser.Scene, definitions: readonly ItemDefinition[]) {
    validateItems(definitions);
    for (const definition of definitions) {
      const key = itemAsset(definition.kind).key;
      const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
      const scale = Math.min(definition.width / source.width, definition.height / source.height);
      const image = scene.add.image(0, 0, key).setOrigin(0.5, 1).setDisplaySize(source.width * scale, source.height * scale);
      this.items.push({ definition, image, collected: false });
    }
    this.place();
  }

  collect(player: Bounds): ItemKind[] {
    const acquired: ItemKind[] = [];
    let quizCollected = false;
    for (const item of this.items) {
      if (item.collected) continue;
      const quiz = ITEM_TYPES[item.definition.kind].type === "quiz";
      // Overlapping markers each need their own answered question before being consumed.
      if (quiz && quizCollected) continue;
      const bounds = item.image.getBounds();
      if (player.right <= bounds.left || player.left >= bounds.right ||
          player.bottom <= bounds.top || player.top >= bounds.bottom) continue;
      item.collected = true;
      item.image.setVisible(false);
      acquired.push(item.definition.kind);
      quizCollected ||= quiz;
    }
    return acquired;
  }

  rebase(shift: number): void { this.originX += shift; this.place(); }

  reset(): void {
    this.originX = 0;
    for (const item of this.items) {
      item.collected = false;
      item.image.setVisible(true);
    }
    this.place();
  }

  private place(): void {
    for (const { definition, image } of this.items) {
      image.setPosition(definition.x + definition.width / 2 - this.originX, definition.y + definition.height);
    }
  }
}
