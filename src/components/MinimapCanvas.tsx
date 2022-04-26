import { useEffect, useRef } from "react";
import Board from "../Board";
import { getTileInfo } from "../tiles";

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;

const draw = (): void => {
   /** How far away the minimap is from the corner of the window */
   const MARGIN = 20;
   /** Size of the minimap */
   const SIZE = 150;

   canvas.width = SIZE;
   canvas.height = SIZE;

   canvas.style.left = MARGIN + "px";
   canvas.style.bottom = MARGIN + "px";

   const unitSize = SIZE / Board.dimensions;

   ctx.globalCompositeOperation = "lighten";

   for (let y = 0; y < Board.dimensions; y++) {
      for (let x = 0; x < Board.dimensions; x++) {
         const tileType = Board.getTile(x, y);

         const tileInfo = getTileInfo(tileType);
         ctx.fillStyle = tileInfo.colour;

         ctx.fillRect(x * unitSize, y * unitSize, unitSize, unitSize);
      }
   }
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