import type Phaser from "phaser";
import { validateDecorations } from "./decorations";
import type { DecorationDefinition } from "./decorations";
import { decorationAsset } from "./stages";

export class StageDecorations {
  private originX = 0;
  private readonly items: { definition: DecorationDefinition; image: Phaser.GameObjects.Image }[] = [];

  constructor(scene: Phaser.Scene, definitions: readonly DecorationDefinition[]) {
    validateDecorations(definitions);
    for (const definition of definitions) {
      const key = decorationAsset(definition.kind).key;
      const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
      const scale = Math.min(definition.width / source.width, definition.height / source.height);
      const image = scene.add.image(0, 0, key).setOrigin(0.5, 1).setDisplaySize(source.width * scale, source.height * scale);
      this.items.push({ definition, image });
    }
    this.place();
  }

  rebase(shift: number): void { this.originX += shift; this.place(); }

  reset(): void { this.originX = 0; this.place(); }

  private place(): void {
    for (const { definition, image } of this.items) {
      image.setPosition(definition.x + definition.width / 2 - this.originX, definition.y + definition.height);
    }
  }
}
