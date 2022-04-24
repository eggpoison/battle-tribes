import { useEffect, useRef } from "react";
import "../css/canvas.css";

let canvas: HTMLCanvasElement;

const updateCanvasSize = (): void => {
   const width = window.innerWidth;
   const height = window.innerHeight;

   canvas.width = width;
   canvas.height = height;
}

// Make the canvas size update when the window is resized
window.addEventListener("resize", updateCanvasSize);

const setupCanvas = (): void => {
   updateCanvasSize();
}

export function render(): void {
   // console.log("render");
}

const Canvas = () => {
   const canvasRef = useRef<HTMLCanvasElement | null>(null);

   // Get the canvas
   useEffect(() => {
      if (canvasRef.current !== null) {
         canvas = canvasRef.current;

         setupCanvas();
      }
   }, []);

   return <canvas ref={canvasRef} id="canvas"></canvas>;
}

export default Canvas;