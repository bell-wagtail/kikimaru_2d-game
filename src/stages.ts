import manifest from "./kikimaru-assets/manifest.json";
import { WORLD } from "./movement";
import type { ObstacleDefinition, ObstacleKind } from "./obstacles";
import { parseStageMap } from "./stageMap";
import type { StageMapGrid } from "./stageMap";
import type { DecorationDefinition } from "./decorations";
import type { GroundHole } from "./ground";
import teaRiverMap from "./stage-maps/tea-river.txt?raw";

export interface StageDefinition {
  readonly id: string;
  readonly background: {
    readonly assetKey: string;
    readonly scrollFactor: number;
    readonly seamBlendPixels: number;
  };
  readonly obstacles?: readonly ObstacleDefinition[];
  readonly decorations?: readonly DecorationDefinition[];
  readonly holes?: readonly GroundHole[];
}

export const STAGE_MAP_GRID = {
  cellWidth: 60, cellHeight: 36, originX: 0, groundY: WORLD.ground
} as const satisfies StageMapGrid;

export const STAGES = {
  teaRiver: {
    id: "tea-river",
    background: {
      assetKey: "background/tea_river_repeat_x",
      scrollFactor: 0.35,
      seamBlendPixels: 48
    },
    ...parseStageMap(teaRiverMap, STAGE_MAP_GRID)
  }
} as const satisfies Record<string, StageDefinition>;

export const DEFAULT_STAGE: StageDefinition = STAGES.teaRiver;

const backgroundUrls = import.meta.glob<string>("./kikimaru-assets/assets/backgrounds/*.png", {
  eager: true, query: "?url", import: "default"
});

const obstacleTypes: Record<ObstacleKind, string> = { rock: "props/rock" };
const propUrls = import.meta.glob<string>([
  "./kikimaru-assets/assets/props/rock.png", "./kikimaru-assets/assets/props/tea.png"
], {
  eager: true, query: "?url", import: "default"
});

export function decorationAsset(kind: DecorationDefinition["kind"]): { key: string; url: string } {
  const asset = manifest.files.find(file => file.key === `props/${kind}`);
  const url = asset && propUrls[`./kikimaru-assets/${asset.path}`];
  if (!asset || !url) throw new Error(`仮表示素材をmanifestに登録してください: ${kind}`);
  return { key: asset.key, url };
}

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
