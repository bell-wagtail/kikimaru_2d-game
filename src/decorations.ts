export interface DecorationDefinition {
  readonly id: string;
  readonly kind: "tea";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function validateDecorations(definitions: readonly DecorationDefinition[]): void {
  const ids = new Set<string>();
  for (const decoration of definitions) {
    if (!decoration.id || ids.has(decoration.id) || decoration.kind !== "tea" ||
        ![decoration.x, decoration.y, decoration.width, decoration.height].every(Number.isFinite) ||
        decoration.width <= 0 || decoration.height <= 0) {
      throw new Error(`仮表示のID・種類・座標・大きさが不正です: ${decoration.id}`);
    }
    ids.add(decoration.id);
  }
}
