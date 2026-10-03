export const ITEM_TYPES = {
  tea: { type: "powerUp", assetKey: "props/tea", symbol: "o", effect: "autoDash", durationSeconds: 10,
    name: "お茶", glow: { color: "#65c94c", diameterScale: 1.35 } },
  shrimp: { type: "powerUp", assetKey: "props/shrimp", symbol: "j", effect: "doubleJump", durationSeconds: 10,
    name: "えび", glow: { color: "#ed6b63", diameterScale: 1.75 } },
  fish: { type: "score", assetKey: "props/fish", symbol: "F", name: "魚" },
  mandarin: { type: "score", assetKey: "props/mandarin", symbol: "M", name: "みかん" },
  strawberry: { type: "score", assetKey: "props/strawberry", symbol: "S", name: "いちご" },
  quiz: { type: "quiz", assetKey: "props/quiz_marker", symbol: "Q", name: "クイズ" }
} as const;

export type ItemKind = keyof typeof ITEM_TYPES;
type KindOfType<T extends (typeof ITEM_TYPES)[ItemKind]["type"]> = {
  [K in ItemKind]: (typeof ITEM_TYPES)[K]["type"] extends T ? K : never
}[ItemKind];
export type PowerUpKind = KindOfType<"powerUp">;
export type ScoreItemKind = KindOfType<"score">;
export type PowerUpEffect = (typeof ITEM_TYPES)[PowerUpKind]["effect"];

export function isPowerUpKind(kind: ItemKind): kind is PowerUpKind {
  return ITEM_TYPES[kind].type === "powerUp";
}

export const POWER_UP_KINDS = (Object.keys(ITEM_TYPES) as ItemKind[]).filter(isPowerUpKind);

export interface ItemDefinition {
  readonly id: string;
  readonly kind: ItemKind;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function itemKindForSymbol(symbol: string): ItemKind | undefined {
  return (Object.keys(ITEM_TYPES) as ItemKind[]).find(kind => ITEM_TYPES[kind].symbol === symbol);
}

export function validateItems(definitions: readonly ItemDefinition[]): void {
  const ids = new Set<string>();
  for (const item of definitions) {
    if (!item.id || ids.has(item.id) || !Object.hasOwn(ITEM_TYPES, item.kind) ||
        ![item.x, item.y, item.width, item.height].every(Number.isFinite) ||
        item.width <= 0 || item.height <= 0) {
      throw new Error(`アイテムのID・種類・座標・大きさが不正です: ${item.id}`);
    }
    ids.add(item.id);
  }
}
