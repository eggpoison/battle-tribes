import { useEffect, useRef } from "react";
import Board from "../Board";
import TILE_INFO_MAP from "../tiles";
import { Colour } from "../utils";
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;

const getTilePixelData = (minimapSize: number, minimapX: number, minimapY: number): [number, number, number, number] => {
   /** Size of the board */
   const BOARD_SIZE = Board.dimensions;

   const tileX = Math.floor(minimapX * BOARD_SIZE / minimapSize);
   const tileY = Math.floor(minimapY * BOARD_SIZE / minimapSize);

   const tileType = Board.getTileType(tileX, tileY);

   const tileColourCode = TILE_INFO_MAP.get(tileType)!.colour;
   const rgb = new Colour(tileColourCode).getRGB();
   return [rgb[0], rgb[1], rgb[2], 255];
}

const getPixelIndex = (minimapSize: number, x: number, y: number): number => {
   return (y * minimapSize + x) * 4;
}

const draw = (): void => {
   /** How far away the minimap is from the corner of the window */
   const MARGIN = 20;
   /** Size of the minimap */
   const MINIMAP_SIZE = 150;

   canvas.width = MINIMAP_SIZE;
   canvas.height = MINIMAP_SIZE;

   canvas.style.left = MARGIN + "px";
   canvas.style.bottom = MARGIN + "px";

   const imageData = ctx.createImageData(MINIMAP_SIZE, MINIMAP_SIZE);

   for (let y = 0; y < MINIMAP_SIZE; y++) {
      for (let x = 0; x < MINIMAP_SIZE; x++) {
         const [r, g, b, a] = getTilePixelData(MINIMAP_SIZE, x, y);

         const pixelIdx = getPixelIndex(MINIMAP_SIZE, x, y);
         imageData.data[pixelIdx] = r;
         imageData.data[pixelIdx + 1] = g;
         imageData.data[pixelIdx + 2] = b;
         imageData.data[pixelIdx + 3] = a;
      }
   }

   ctx.putImageData(imageData, 0, 0);
}

export function drawMinimapAttempt(): boolean {
   if (typeof canvas !== "undefined") {
      draw();
      return true;
   }
   return false;
}

const MinimapCanvas = () => {
   const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

   useEffect(() => {
      if (minimapCanvasRef.current !== null) {
         canvas = minimapCanvasRef.current;
         ctx = canvas.getContext("2d")!;
      }
   }, []);

  return (
    <canvas id="minimap-canvas" ref={minimapCanvasRef}></canvas>
  );
}

export default MinimapCanvas;