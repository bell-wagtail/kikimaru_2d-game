import manifest from "./kikimaru-assets/manifest.json";
import { WORLD } from "./movement";
import type { ObstacleDefinition, ObstacleKind } from "./obstacles";

export interface StageDefinition {
  readonly id: string;
  readonly background: {
    readonly assetKey: string;
    readonly scrollFactor: number;
    readonly seamBlendPixels: number;
  };
  readonly obstacles?: readonly ObstacleDefinition[];
}

export const STAGES = {
  teaRiver: {
    id: "tea-river",
    background: {
      assetKey: "background/tea_river_repeat_x",
      scrollFactor: 0.35,
      seamBlendPixels: 48
    },
    obstacles: [
      { id: "left-rock", kind: "rock", x: 120, y: WORLD.ground - 36, width: 60, height: 36 },
      { id: "right-rock", kind: "rock", x: 1020, y: WORLD.ground - 36, width: 60, height: 36 }
    ]
  }
} as const satisfies Record<string, StageDefinition>;

export const DEFAULT_STAGE: StageDefinition = STAGES.teaRiver;

const backgroundUrls = import.meta.glob<string>("./kikimaru-assets/assets/backgrounds/*.png", {
  eager: true, query: "?url", import: "default"
});

const obstacleTypes: Record<ObstacleKind, string> = { rock: "props/rock" };
const propUrls = import.meta.glob<string>("./kikimaru-assets/assets/props/rock.png", {
  eager: true, query: "?url", import: "default"
});

export function obstacleAsset(kind: ObstacleKind): { key: string; url: string } {
  const asset = manifest.files.find(file => file.key === obstacleTypes[kind]);
  const url = asset && propUrls[`./kikimaru-assets/${asset.path}`];
  if (!asset || !url) throw new Error(`障害物素材をmanifestに登録してください: ${kind}`);
  return { key: asset.key, url };
}

export function backgroundAsset(stage: StageDefinition): { key: string; url: string } {
  const asset = manifest.files.find(file => file.key === stage.background.assetKey);
  const url = asset && backgroundUrls[`./kikimaru-assets/${asset.path}`];
  if (!asset || !url || !("repeatX" in asset && asset.repeatX)) {
    throw new Error(`横反復用背景をmanifestに登録してください: ${stage.background.assetKey}`);
  }
  return { key: asset.key, url };
}
