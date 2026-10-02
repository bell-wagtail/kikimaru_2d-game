export const ITEM_TYPES = {
  tea: { assetKey: "props/tea", symbol: "o", effect: "autoDash", durationSeconds: 10, label: "お茶: 自動ダッシュ" },
  shrimp: { assetKey: "props/shrimp", symbol: "j", effect: "doubleJump", durationSeconds: 10, label: "えび: 2段ジャンプ" }
} as const;

export type ItemKind = keyof typeof ITEM_TYPES;
export type PowerUpEffect = (typeof ITEM_TYPES)[ItemKind]["effect"];

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
