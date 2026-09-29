import manifest from "./kikimaru-assets/manifest.json";

export interface StageDefinition {
  readonly id: string;
  readonly background: {
    readonly assetKey: string;
    readonly scrollFactor: number;
    readonly seamBlendPixels: number;
  };
}

export const STAGES = {
  teaRiver: {
    id: "tea-river",
    background: {
      assetKey: "background/tea_river_repeat_x",
      scrollFactor: 0.35,
      seamBlendPixels: 48
    }
  }
} as const satisfies Record<string, StageDefinition>;

export const DEFAULT_STAGE: StageDefinition = STAGES.teaRiver;

const backgroundUrls = import.meta.glob<string>("./kikimaru-assets/assets/backgrounds/*.png", {
  eager: true, query: "?url", import: "default"
});

export function backgroundAsset(stage: StageDefinition): { key: string; url: string } {
  const asset = manifest.files.find(file => file.key === stage.background.assetKey);
  const url = asset && backgroundUrls[`./kikimaru-assets/${asset.path}`];
  if (!asset || !url || !("repeatX" in asset && asset.repeatX)) {
    throw new Error(`横反復用背景をmanifestに登録してください: ${stage.background.assetKey}`);
  }
  return { key: asset.key, url };
}
