import Phaser from "phaser";
import { WORLD } from "./movement";
import { advanceTile, seamBlendAlpha } from "./scrolling";
import type { StageDefinition } from "./stages";
import { GROUND_APPEARANCE, groundTexture } from "./groundTextures";

export class RepeatingScenery {
  private background: Phaser.GameObjects.TileSprite;
  private ground: Phaser.GameObjects.TileSprite;
  private backgroundWidth: number;
  private scale: number;
  private factor: number;

  constructor(scene: Phaser.Scene, stage: StageDefinition) {
    const settings = stage.background;
    if (!Number.isFinite(settings.scrollFactor) || settings.scrollFactor < 0 ||
        !Number.isInteger(settings.seamBlendPixels) || settings.seamBlendPixels < 0) {
      throw new Error("背景のスクロール倍率・継ぎ目幅が不正です");
    }
    const source = scene.textures.get(settings.assetKey).getSourceImage() as HTMLImageElement;
    const blend = settings.seamBlendPixels;
    if (blend === 1 || blend * 2 >= source.width) throw new Error("継ぎ目幅は0または画像幅の半分未満の2px以上にしてください");
    const textureKey = `${settings.assetKey}:repeat:${blend}`;
    this.backgroundWidth = source.width - blend;
    this.scale = WORLD.height / source.height;
    this.factor = settings.scrollFactor;

    if (!scene.textures.exists(textureKey)) {
      const canvas = document.createElement("canvas");
      canvas.width = this.backgroundWidth;
      canvas.height = source.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(source, 0, 0);
      // Blend the trailing strip into the leading strip once; keep the original PNG intact.
      for (let x = 0; x < blend; x++) {
        ctx.globalAlpha = seamBlendAlpha(x, blend);
        ctx.drawImage(source, this.backgroundWidth + x, 0, 1, source.height, x, 0, 1, source.height);
      }
      scene.textures.addCanvas(textureKey, canvas);
    }

    this.background = scene.add.tileSprite(0, 0, WORLD.width, WORLD.height, textureKey)
      .setOrigin(0).setScrollFactor(0).setTileScale(this.scale);
    scene.add.rectangle(0, 0, WORLD.width, WORLD.height, 0xf9f7e7, 0.1).setOrigin(0).setScrollFactor(0);

    const groundKey = groundTexture(scene.textures);
    const surface = WORLD.ground - GROUND_APPEARANCE.surfaceOffset;
    this.ground = scene.add.tileSprite(0, surface, WORLD.width, WORLD.height - surface, groundKey)
      .setOrigin(0).setScrollFactor(0);
  }

  advance(distance: number): void {
    this.background.tilePositionX = advanceTile(this.background.tilePositionX, distance, this.scale, this.factor, this.backgroundWidth);
    this.ground.tilePositionX = advanceTile(this.ground.tilePositionX, distance, 1, 1, GROUND_APPEARANCE.tileWidth);
  }

  reset(): void {
    this.background.tilePositionX = 0;
    this.ground.tilePositionX = 0;
  }
}
