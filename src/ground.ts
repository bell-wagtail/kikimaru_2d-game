export interface GroundHole {
  readonly id: string;
  readonly x: number;
  readonly width: number;
}

export interface GroundSegment { readonly left: number; readonly right: number }

export function mergeGroundHoles(holes: readonly GroundHole[]): GroundHole[] {
  const merged: GroundHole[] = [];
  for (const hole of [...holes].sort((a, b) => a.x - b.x)) {
    const previous = merged.at(-1);
    if (previous && hole.x <= previous.x + previous.width) {
      merged[merged.length - 1] = { ...previous, width: Math.max(previous.x + previous.width, hole.x + hole.width) - previous.x };
    } else merged.push({ ...hole });
  }
  return merged;
}

export function validateGroundHoles(holes: readonly GroundHole[]): void {
  const ids = new Set<string>();
  for (const hole of holes) {
    if (!hole.id || ids.has(hole.id) || !Number.isFinite(hole.x) ||
        !Number.isFinite(hole.width) || hole.width <= 0 || !Number.isFinite(hole.x + hole.width)) {
      throw new Error(`穴のID・位置・幅が不正です: ${hole.id}`);
    }
    ids.add(hole.id);
  }
}

export function groundSegments(left: number, right: number, holes: readonly GroundHole[]): GroundSegment[] {
  const segments: GroundSegment[] = [];
  let cursor = left;
  for (const hole of [...holes].sort((a, b) => a.x - b.x)) {
    if (hole.x + hole.width <= cursor || hole.x >= right) continue;
    if (hole.x > cursor) segments.push({ left: cursor, right: hole.x });
    cursor = Math.min(right, Math.max(cursor, hole.x + hole.width));
  }
  if (cursor < right) segments.push({ left: cursor, right });
  return segments;
}

export function canLandOnGround(previousBottom: number, velocityY: number, surface: number): boolean {
  return velocityY >= 0 && previousBottom <= surface + 1e-6;
}
