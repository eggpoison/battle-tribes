import { useEffect, useRef } from "react";
import Board from "../Board";
import Camera from "../Camera";
import OPTIONS from "../options";
import SETTINGS from "../settings";
import { getTileInfo } from "../tiles";

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

export function render(): void {
   // Clear canvas for redrawing
   // ctx.clearRect(0, 0, canvas.width, canvas.height);
   ctx.fillStyle = SETTINGS.backgroundColour;
   ctx.fillRect(0, 0, canvas.width, canvas.height);

   // Draw tiles
   for (let y = 0; y < Board.dimensions; y++) {
      for (let x = 0; x < Board.dimensions; x++) {
         const tileType = Board.getTile(x, y);

         const tileInfo = getTileInfo(tileType);
         ctx.fillStyle = tileInfo.colour;

         ctx.fillRect(Camera.getXPositionInCamera(x * Board.tileSize), Camera.getYPositionInCamera(y * Board.tileSize), Board.tileSize, Board.tileSize);
      }
   }

   // Draw lines between tiles

   const DEFAULT_BORDER_COLOUR = "rgba(0, 0, 0, 0.5)";
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

   // Enable for a fun time
   // ctx.rotate(1/SETTINGS.tps);
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