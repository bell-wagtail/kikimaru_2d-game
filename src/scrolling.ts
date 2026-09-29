export function wrap(value: number, period: number): number {
  return ((value % period) + period) % period;
}

export function advanceTile(position: number, distance: number, scale: number, factor: number, width: number): number {
  return wrap(position + distance * factor / scale, width);
}

export const REBASE_DISTANCE = 8192;

export function rebaseShift(x: number, origin: number): number {
  return Math.trunc((x - origin) / REBASE_DISTANCE) * REBASE_DISTANCE;
}

export interface HorizontalBody {
  position: { x: number };
  prev: { x: number };
  prevFrame: { x: number };
  updateCenter(): void;
}

export function rebaseBody(body: HorizontalBody, object: { x: number }, shift: number): void {
  // Translate current and previous coordinates together to preserve the physics-step delta.
  body.position.x -= shift;
  body.prev.x -= shift;
  body.prevFrame.x -= shift;
  object.x -= shift;
  body.updateCenter();
}

export function seamBlendAlpha(column: number, width: number): number {
  const t = column / (width - 1);
  return 1 - t * t * (3 - 2 * t);
}
