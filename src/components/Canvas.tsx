import { useEffect, useRef } from "react";
import Board from "../Board";
import Camera from "../Camera";
import OPTIONS from "../options";
import SETTINGS from "../settings";
import TILE_INFO, { TileKind } from "../tile-types";
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

export function getCanvasContext(): CanvasRenderingContext2D { return ctx; }

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

export function renderBoard(): void {
   // Clear canvas for redrawing
   ctx.fillStyle = SETTINGS.backgroundColour;
   ctx.fillRect(0, 0, canvas.width, canvas.height);

   const [chunkMinX, chunkMaxX, chunkMinY, chunkMaxY] = Camera.getVisibleChunkBounds();
   const minX = Math.max(chunkMinX * Board.chunkSize, 0);
   const maxX = Math.min((chunkMaxX + 1) * Board.chunkSize, Board.dimensions - 1);
   const minY = Math.max(chunkMinY * Board.chunkSize, 0);
   const maxY = Math.min((chunkMaxY + 1) * Board.chunkSize, Board.dimensions - 1);

   const wallBorderCoords = new Array<[number, number, number, number]>();

   // Draw tiles
   for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
         const tile = Board.getTile(x, y);

         if (tile.isWall) {
            ctx.fillStyle = getWallColour(tile.kind);
         } else {
            const tileInfo = TILE_INFO[tile.kind];
            ctx.fillStyle = tileInfo.colour;
         }

         ctx.fillRect(Camera.getXPositionInCamera(x * Board.tileSize), Camera.getYPositionInCamera(y * Board.tileSize), Board.tileSize, Board.tileSize);

         // Wall tile borders
         if (tile.isWall) {
            for (let dir = 0; dir < 4; dir++) {
               const xOffset = TILE_OFFSETS[dir][0];
               if (x + xOffset < 0 || x + xOffset >= Board.dimensions) continue;
               const yOffset = TILE_OFFSETS[dir][1];
               if (y + yOffset < 0 || y + yOffset >= Board.dimensions) continue;

               const offsetTile = Board.getTile(x + xOffset, y + yOffset);

               if (!offsetTile.isWall) {
                  const xAdd = TILE_Y_STARTS[dir] === TILE_Y_ENDS[dir] ? SETTINGS.wallOutlineWidth/2 : 0;
                  const yAdd = TILE_X_STARTS[dir] === TILE_X_ENDS[dir] ? SETTINGS.wallOutlineWidth/2 : 0;

                  const startX = (x + TILE_X_STARTS[dir]) * Board.tileSize - xAdd;
                  const endX = (x + TILE_X_ENDS[dir]) * Board.tileSize + xAdd;
                  
                  const startY = (y + TILE_Y_STARTS[dir]) * Board.tileSize - yAdd;
                  const endY = (y + TILE_Y_ENDS[dir]) * Board.tileSize + yAdd;

                  wallBorderCoords.push([startX, endX, startY, endY]);
               }
            }
         }
      }
   }

   // Draw wall borders
   ctx.strokeStyle = "#000";
   ctx.lineWidth = SETTINGS.wallOutlineWidth;
   for (const [startX, endX, startY, endY] of wallBorderCoords) {
      ctx.beginPath();
                  
      ctx.moveTo(Camera.getXPositionInCamera(startX), Camera.getYPositionInCamera(startY));
      ctx.lineTo(Camera.getXPositionInCamera(endX), Camera.getYPositionInCamera(endY));

      ctx.stroke();
   }

   // Draw lines between tiles

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

const Canvas = () => {
   const canvasRef = useRef<HTMLCanvasElement | null>(null);

   // Get the canvas
   useEffect(() => {
      if (canvasRef.current !== null) {
         canvas = canvasRef.current;
         ctx = canvas.getContext("2d")!;

         setupCanvas();
      }
   }, []);

   return <canvas ref={canvasRef} id="canvas"></canvas>;
}

export default Canvas;