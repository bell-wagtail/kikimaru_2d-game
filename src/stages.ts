import manifest from "./kikimaru-assets/manifest.json";
import { WORLD } from "./movement";
import type { ObstacleDefinition, ObstacleKind } from "./obstacles";
import { parseStageMap } from "./stageMap";
import type { StageMapGrid } from "./stageMap";
import type { DecorationDefinition } from "./decorations";
import { ITEM_TYPES } from "./items";
import type { ItemDefinition, ItemKind } from "./items";
import type { GroundHole } from "./ground";
import type { StageEndpoint } from "./endpoints";
import teaRiverMap from "./stage-maps/tea-river.txt?raw";
import teaRiverTrailMap from "./stage-maps/tea-river-trail.txt?raw";

export interface StageDefinition {
  readonly id: string;
  readonly background: {
    readonly assetKey: string;
    readonly scrollFactor: number;
    readonly seamBlendPixels: number;
  };
  readonly obstacles?: readonly ObstacleDefinition[];
  readonly items?: readonly ItemDefinition[];
  readonly decorations?: readonly DecorationDefinition[];
  readonly holes?: readonly GroundHole[];
  readonly start?: StageEndpoint;
  readonly goal?: StageEndpoint;
}

export const STAGE_MAP_GRID = {
  cellWidth: 60, cellHeight: 36, originX: 0, groundY: WORLD.ground
} as const satisfies StageMapGrid;

export const TRAIL_MAP_GRID = { ...STAGE_MAP_GRID } as const satisfies StageMapGrid;

const teaRiverBackground = {
  assetKey: "background/tea_river_repeat_x", scrollFactor: 0.35, seamBlendPixels: 48
} as const;

export const STAGES = {
  teaRiver: {
    id: "tea-river",
    background: teaRiverBackground,
    ...parseStageMap(teaRiverMap, STAGE_MAP_GRID)
  },
  teaRiverTrail: {
    id: "tea-river-trail",
    background: teaRiverBackground,
    ...parseStageMap(teaRiverTrailMap, TRAIL_MAP_GRID)
  }
} as const satisfies Record<string, StageDefinition>;

export const DEFAULT_STAGE: StageDefinition = STAGES.teaRiver;

const backgroundUrls = import.meta.glob<string>("./kikimaru-assets/assets/backgrounds/*.png", {
  eager: true, query: "?url", import: "default"
});

const obstacleTypes: Record<ObstacleKind, string> = { rock: "props/rock" };
const propUrls = import.meta.glob<string>([
  "./kikimaru-assets/assets/props/*.png"
], {
  eager: true, query: "?url", import: "default"
});

const milestoneUrls = import.meta.glob<string>([
  "./kikimaru-assets/assets/props/goal_flag.png",
  "./kikimaru-assets/assets/character/right/head_happy.png",
  "./kikimaru-assets/assets/character/front/sparkle.png"
], { eager: true, query: "?url", import: "default" });

export function milestoneAsset(key: string): { key: string; url: string } {
  const asset = manifest.files.find(file => file.key === key);
  const url = asset && milestoneUrls[`./kikimaru-assets/${asset.path}`];
  if (!asset || !url) throw new Error(`開始・ゴール素材をmanifestに登録してください: ${key}`);
  return { key: asset.key, url };
}

export function stageItems(stage: StageDefinition): readonly ItemDefinition[] {
  return [...(stage.items ?? []), ...(stage.decorations ?? [])];
}

export function itemAsset(kind: ItemKind): { key: string; url: string } {
  const asset = manifest.files.find(file => file.key === ITEM_TYPES[kind].assetKey);
  const url = asset && propUrls[`./kikimaru-assets/${asset.path}`];
  if (!asset || !url) throw new Error(`アイテム素材をmanifestに登録してください: ${kind}`);
  return { key: asset.key, url };
}

export const decorationAsset = itemAsset;

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
