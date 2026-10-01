import { validateObstacles } from "./obstacles.ts";
import type { ObstacleDefinition } from "./obstacles.ts";
import { validateDecorations } from "./decorations.ts";
import type { DecorationDefinition } from "./decorations.ts";

export interface StageMapGrid {
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly originX: number;
  readonly groundY: number;
}

export function parseStageMap(text: string, grid: StageMapGrid): {
  obstacles: ObstacleDefinition[];
  decorations: DecorationDefinition[];
} {
  if (![grid.cellWidth, grid.cellHeight, grid.originX, grid.groundY].every(Number.isFinite) ||
      grid.cellWidth <= 0 || grid.cellHeight <= 0) {
    throw new Error("文字マップのマス幅・高さ・原点が不正です");
  }
  const rows = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").replace(/^\n+|\n+$/g, "").split("\n");
  const width = rows[0].length;
  if (!width || rows.some(row => row.length !== width)) throw new Error("文字マップは全行の文字数をそろえてください");
  const groundRow = rows.length - 1;
  if (groundRow < 1 || !/^=+$/.test(rows[groundRow])) throw new Error("文字マップの最下行は地面基準の = で埋めてください");

  const obstacles: ObstacleDefinition[] = [];
  const decorations: DecorationDefinition[] = [];
  for (let row = 0; row < groundRow; row++) {
    for (let column = 0; column < width; column++) {
      const symbol = rows[row][column];
      if (symbol === "." || symbol === " ") continue;
      const bounds = {
        x: grid.originX + column * grid.cellWidth,
        y: grid.groundY - (groundRow - row) * grid.cellHeight,
        width: grid.cellWidth, height: grid.cellHeight
      };
      if (symbol === "x") obstacles.push({ id: `rock-r${row}-c${column}`, kind: "rock", ...bounds });
      else if (symbol === "o") decorations.push({ id: `tea-r${row}-c${column}`, kind: "tea", ...bounds });
      else throw new Error(`文字マップの${row + 1}行${column + 1}列に未対応の記号があります: ${symbol}`);
    }
  }
  validateObstacles(obstacles);
  validateDecorations(decorations);
  return { obstacles, decorations };
}
