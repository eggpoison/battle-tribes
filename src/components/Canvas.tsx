import { useEffect, useRef } from "react";
import Board, { Coordinates } from "../Board";
import Camera from "../Camera";
import OPTIONS from "../options";
import SETTINGS from "../settings";
import TILE_INFO, { TileKind } from "../data/tile-types";
import { BasicCol } from "../utils";

const wallColours: Partial<Record<TileKind, string>> = {};

const getWallColour = (tileKind: TileKind): string => {
   if (!wallColours.hasOwnProperty(tileKind)) {
      const tileInfo = TILE_INFO[tileKind];

      const col = BasicCol.from(tileInfo.colour);
      col.darken(0.3);

      const colour = col.getCode();
      wallColours[tileKind] = colour;
      return colour;
   } else {
      return wallColours[tileKind]!;
   }
}

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;

export function getGameCanvasContext(): CanvasRenderingContext2D { return ctx; }

let width: number;
let height: number;

export function getCanvasWidth(): number { return width; }
export function getCanvasHeight(): number { return height; }

const updateCanvasSize = (): void => {
   width = window.innerWidth;
   height = window.innerHeight;

   canvas.width = width;
   canvas.height = height;
}

// Make the canvas size update when the window is resized
window.addEventListener("resize", updateCanvasSize);

const setupCanvas = (): void => {
   updateCanvasSize();
}

const TILE_OFFSETS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

const TILE_X_STARTS = [0, 1, 0, 0];
const TILE_X_ENDS = [1, 1, 1, 0];
const TILE_Y_STARTS = [0, 0, 1, 0];
const TILE_Y_ENDS = [0, 1, 1, 1];

/** Clear the canvas for redrawing */
export function clearCanvas(): void {
   ctx.fillStyle = SETTINGS.backgroundColour;
   ctx.fillRect(0, 0, canvas.width, canvas.height);
}

let wallTiles = new Array<Coordinates>();

export function renderGroundTiles(): void {
   const [chunkMinX, chunkMaxX, chunkMinY, chunkMaxY] = Camera.getVisibleChunkBounds();
   const minX = Math.max(chunkMinX * Board.chunkSize, 0);
   const maxX = Math.min((chunkMaxX + 1) * Board.chunkSize, Board.dimensions - 1);
   const minY = Math.max(chunkMinY * Board.chunkSize, 0);
   const maxY = Math.min((chunkMaxY + 1) * Board.chunkSize, Board.dimensions - 1);

   // Draw tiles
   for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
         const tile = Board.getTile(x, y);

         // If the tile is a wall tile, add it to the list of wall tiles to be rendered later
         if (tile.isWall) {
            wallTiles.push([x, y]);
            continue;
         }

         const tileInfo = TILE_INFO[tile.kind];
         ctx.fillStyle = tileInfo.colour;

         ctx.fillRect(Camera.getXPositionInCamera(x * Board.tileSize), Camera.getYPositionInCamera(y * Board.tileSize), Board.tileSize, Board.tileSize);
      }
   }

   // Draw borders between tiles

   // const DEFAULT_BORDER_COLOUR = "#444";
   const DEFAULT_BORDER_COLOUR = "rgba(0, 0, 0, 0)";
   const CHUNK_BORDER_COLOUR = "red";

   const updateStrokeStyle = (lineIndex: number): void => {
      if (OPTIONS.showChunkBorders && lineIndex % Board.chunkSize === 0) {
         ctx.lineWidth = 3;
         ctx.strokeStyle = CHUNK_BORDER_COLOUR;
      } else {
         ctx.lineWidth = 2;
         ctx.strokeStyle = DEFAULT_BORDER_COLOUR;
      }
   }

   // Vertical
   for (let x = 0; x <= Board.dimensions; x++) {
      updateStrokeStyle(x);

      ctx.beginPath();
      ctx.moveTo(Camera.getXPositionInCamera(x * Board.tileSize), Camera.getYPositionInCamera(0));
      ctx.lineTo(Camera.getXPositionInCamera(x * Board.tileSize), Camera.getYPositionInCamera(Board.dimensions * Board.tileSize));
      ctx.stroke();
   }
   // Horizontal
   for (let y = 0; y <= Board.dimensions; y++) {
      updateStrokeStyle(y);

      ctx.beginPath();
      ctx.moveTo(Camera.getXPositionInCamera(0), Camera.getYPositionInCamera(y * Board.tileSize));
      ctx.lineTo(Camera.getXPositionInCamera(Board.dimensions * Board.tileSize), Camera.getYPositionInCamera(y * Board.tileSize));
      ctx.stroke();
   }
}

export function renderWallTiles(): void {
   const wallTileBorders = new Array<[number, number, number]>();

   // Render the wall tiles
   for (const [x, y] of wallTiles) {
      const tile = Board.getTile(x, y);

      ctx.fillStyle = getWallColour(tile.kind);
      ctx.fillRect(Camera.getXPositionInCamera(x * Board.tileSize), Camera.getYPositionInCamera(y * Board.tileSize), Board.tileSize, Board.tileSize);

      // Store any tile borders to be rendered later
      for (let dir = 0; dir < 4; dir++) {
         const xOffset = TILE_OFFSETS[dir][0];
         if (x + xOffset < 0 || x + xOffset >= Board.dimensions) continue;
         const yOffset = TILE_OFFSETS[dir][1];
         if (y + yOffset < 0 || y + yOffset >= Board.dimensions) continue;

         const offsetTile = Board.getTile(x + xOffset, y + yOffset);

         if (!offsetTile.isWall) {
            wallTileBorders.push([x, y, dir]);
         }
      }
   }

   // Render the tile borders
   ctx.strokeStyle = "#000";
   ctx.lineWidth = SETTINGS.wallOutlineWidth;
   for (const [x, y, dir] of wallTileBorders) {
      const xAdd = TILE_Y_STARTS[dir] === TILE_Y_ENDS[dir] ? SETTINGS.wallOutlineWidth/2 : 0;
      const yAdd = TILE_X_STARTS[dir] === TILE_X_ENDS[dir] ? SETTINGS.wallOutlineWidth/2 : 0;

      const startX = (x + TILE_X_STARTS[dir]) * Board.tileSize - xAdd;
      const endX = (x + TILE_X_ENDS[dir]) * Board.tileSize + xAdd;
      
      const startY = (y + TILE_Y_STARTS[dir]) * Board.tileSize - yAdd;
      const endY = (y + TILE_Y_ENDS[dir]) * Board.tileSize + yAdd;

      ctx.beginPath();
                  
      ctx.moveTo(Camera.getXPositionInCamera(startX), Camera.getYPositionInCamera(startY));
      ctx.lineTo(Camera.getXPositionInCamera(endX), Camera.getYPositionInCamera(endY));

      ctx.stroke();
   }

   // Clear the wall tiles array to be used again
   wallTiles = new Array<Coordinates>();
}

export function renderFog(): void {
   const [minChunkX, maxChunkX, minChunkY, maxChunkY] = Camera.getVisibleChunkBounds();

   for (let y = minChunkY * Board.chunkSize; y <= (maxChunkY + 1) * Board.chunkSize - 1; y++) {
      for (let x = minChunkX * Board.chunkSize; x <= (maxChunkX + 1) * Board.chunkSize - 1; x++) {

         // Draw fog of war
         // The "+ 1" in x2 and y2 is to remove gaps between fog.
         const x1 = x * Board.tileSize;
         const x2 = (x + 1) * Board.tileSize + 1;
         const y1 = y * Board.tileSize;
         const y2 = (y + 1) * Board.tileSize + 1;

         const tile = Board.getTile(x, y);

         ctx.fillStyle = `rgba(0, 0, 0, ${tile.fogAmount})`;
         ctx.fillRect(Camera.getXPositionInCamera(x1), Camera.getYPositionInCamera(y1), x2 - x1, y2 - y1);
      }
   }
}

const Canvas = () => {
   const canvasRef = useRef<HTMLCanvasElement | null>(null);

   // Get the canvas
   useEffect(() => {
      if (canvasRef.current !== null) {
         canvas = canvasRef.current;
         ctx = canvas.getContext("2d", { alpha: false })!;

         setupCanvas();
      }
   }, []);

   return <canvas ref={canvasRef} id="canvas"></canvas>;
}

export default Canvas;