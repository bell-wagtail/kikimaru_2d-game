import { validateObstacles } from "./obstacles.ts";
import type { ObstacleDefinition } from "./obstacles.ts";
import { itemKindForSymbol, validateItems } from "./items.ts";
import type { ItemDefinition } from "./items.ts";
import { validateGroundHoles } from "./ground.ts";
import type { GroundHole } from "./ground.ts";
import { ENDPOINT_SYMBOLS, validateEndpoint } from "./endpoints.ts";
import type { StageEndpoint } from "./endpoints.ts";

export interface StageMapGrid {
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly originX: number;
  readonly groundY: number;
}

export function parseStageMap(text: string, grid: StageMapGrid): {
  obstacles: ObstacleDefinition[];
  items: ItemDefinition[];
  holes: GroundHole[];
  start?: StageEndpoint;
  goal?: StageEndpoint;
} {
  if (![grid.cellWidth, grid.cellHeight, grid.originX, grid.groundY].every(Number.isFinite) ||
      grid.cellWidth <= 0 || grid.cellHeight <= 0) {
    throw new Error("文字マップのマス幅・高さ・原点が不正です");
  }
  const rows = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").replace(/^\n+|\n+$/g, "").split("\n");
  const width = rows[0].length;
  if (!width || rows.some(row => row.length !== width)) throw new Error("文字マップは全行の文字数をそろえてください");
  const groundRow = rows.length - 1;
  if (groundRow < 1 || !/^[=. ]+$/.test(rows[groundRow])) throw new Error("文字マップの最下行は床の = と穴の . / 半角空白で指定してください");

  const obstacles: ObstacleDefinition[] = [];
  const items: ItemDefinition[] = [];
  const holes: GroundHole[] = [];
  const endpoints: { start?: StageEndpoint; goal?: StageEndpoint } = {};
  const locations: Partial<Record<keyof typeof ENDPOINT_SYMBOLS, string>> = {};
  const floor = rows[groundRow];
  for (let column = 0; column < width;) {
    if (floor[column] === "=") { column++; continue; }
    const start = column;
    while (column < width && floor[column] !== "=") column++;
    holes.push({ id: `hole-c${start}`, x: grid.originX + start * grid.cellWidth, width: (column - start) * grid.cellWidth });
  }
  for (let row = 0; row < groundRow; row++) {
    for (let column = 0; column < width; column++) {
      const symbol = rows[row][column];
      if (symbol === "." || symbol === " ") continue;
      const bounds = {
        x: grid.originX + column * grid.cellWidth,
        y: grid.groundY - (groundRow - row) * grid.cellHeight,
        width: grid.cellWidth, height: grid.cellHeight
      };
      const kind = itemKindForSymbol(symbol);
      const endpoint = (Object.keys(ENDPOINT_SYMBOLS) as (keyof typeof ENDPOINT_SYMBOLS)[])
        .find(key => ENDPOINT_SYMBOLS[key] === symbol);
      if (endpoint) {
        const location = `${row + 1}行${column + 1}列の${symbol}`;
        if (endpoints[endpoint]) throw new Error(`${location}は複数指定です（先の指定: ${locations[endpoint]}）`);
        endpoints[endpoint] = bounds;
        locations[endpoint] = location;
      }
      else if (symbol === "x") obstacles.push({ id: `rock-r${row}-c${column}`, kind: "rock", ...bounds });
      else if (kind) items.push({ id: `${kind}-r${row}-c${column}`, kind, ...bounds });
      else throw new Error(`文字マップの${row + 1}行${column + 1}列に未対応の記号があります: ${symbol}`);
    }
  }
  validateObstacles(obstacles);
  validateItems(items);
  validateGroundHoles(holes);
  for (const key of Object.keys(endpoints) as (keyof typeof ENDPOINT_SYMBOLS)[]) {
    validateEndpoint(endpoints[key]!, locations[key]!, grid.groundY, obstacles, holes);
  }
  return { obstacles, items, holes, ...endpoints };
}
