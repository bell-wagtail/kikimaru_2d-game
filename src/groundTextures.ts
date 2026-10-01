import type Phaser from "phaser";
import { WORLD } from "./movement";

export const GROUND_APPEARANCE = {
  tileWidth: 315,
  surfaceOffset: 3,
  grassHeight: 10,
  bankWidth: 24,
  colors: {
    soil: "#e8d9b8", grass: "#c1cc97", fleck: "#d5c29e",
    wall: "#a59474", opening: "#5e513e", depth: "#2e291f"
  }
} as const;

const height = WORLD.height - WORLD.ground + GROUND_APPEARANCE.surfaceOffset;

function canvas(width: number): HTMLCanvasElement {
  const image = document.createElement("canvas");
  image.width = width;
  image.height = height;
  return image;
}

export function groundTexture(textures: Phaser.Textures.TextureManager): string {
  const key = "walk-ground";
  if (!textures.exists(key)) {
    const image = canvas(GROUND_APPEARANCE.tileWidth);
    const ctx = image.getContext("2d")!;
    ctx.fillStyle = GROUND_APPEARANCE.colors.soil;
    ctx.fillRect(0, 0, image.width, height);
    ctx.fillStyle = GROUND_APPEARANCE.colors.grass;
    ctx.fillRect(0, 0, image.width, GROUND_APPEARANCE.grassHeight);
    ctx.fillStyle = GROUND_APPEARANCE.colors.fleck;
    for (let x = 20; x < image.width; x += 63) ctx.fillRect(x, 36 + (x % 5) * 8, 9, 2);
    textures.addCanvas(key, image);
  }
  return key;
}

export function pitTexture(textures: Phaser.Textures.TextureManager): { key: string; bankWidth: number; height: number } {
  const key = "walk-pit";
  const { bankWidth, grassHeight, colors } = GROUND_APPEARANCE;
  if (!textures.exists(key)) {
    const image = canvas(bankWidth * 2 + 1);
    const ctx = image.getContext("2d")!;
    const depth = ctx.createLinearGradient(0, 0, 0, height);
    depth.addColorStop(0, colors.opening);
    depth.addColorStop(1, colors.depth);
    ctx.fillStyle = depth;
    ctx.fillRect(0, 0, image.width, height);

    const bank = canvas(bankWidth);
    const wall = bank.getContext("2d")!;
    const shade = wall.createLinearGradient(4, 0, bankWidth, 0);
    shade.addColorStop(0, colors.soil);
    shade.addColorStop(0.45, colors.wall);
    shade.addColorStop(1, "rgba(165, 148, 116, 0)");
    wall.fillStyle = shade;
    wall.fillRect(0, grassHeight, bankWidth, height - grassHeight);
    wall.fillStyle = colors.grass;
    wall.beginPath();
    wall.moveTo(0, 0);
    wall.lineTo(8, 0);
    wall.lineTo(6, 4);
    wall.lineTo(10, 7);
    wall.lineTo(5, grassHeight);
    wall.lineTo(0, grassHeight);
    wall.fill();
    wall.fillStyle = colors.fleck;
    wall.fillRect(3, 36, 7, 2);
    wall.fillRect(4, 72, 5, 2);
    // Paint only inside the opening; the surrounding floor keeps its original texture and phase.
    ctx.drawImage(bank, 0, 0);
    ctx.save();
    ctx.translate(image.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(bank, 0, 0);
    ctx.restore();
    const texture = textures.addCanvas(key, image)!;
    texture.add("pit-left", 0, 0, 0, bankWidth, height);
    texture.add("pit-middle", 0, bankWidth, 0, 1, height);
    texture.add("pit-right", 0, bankWidth + 1, 0, bankWidth, height);
  }
  return { key, bankWidth, height };
}
