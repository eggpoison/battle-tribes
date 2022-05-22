import { useEffect, useRef } from "react";
import Board from "../Board";
import SETTINGS from "../settings";
import TILE_INFO from "../tile-types";
import { Colour, Point } from "../utils";

export abstract class Minimap {
   private static minimapBackgroundCanvas: HTMLCanvasElement;
   private static minimapBackgroundCtx: CanvasRenderingContext2D;

   private static minimapEntityCanvas: HTMLCanvasElement;
   private static minimapEntityCtx: CanvasRenderingContext2D;

   /** How large the minimap is in pixels */
   private static readonly SIZE: number = 150;
   /** How far away the minimap is from the corner of the window */
   private static readonly MARGIN: number = 20;

   public static setMinimapCanvas(minimapBackgroundCanvas: HTMLCanvasElement): void {
      this.minimapBackgroundCanvas = minimapBackgroundCanvas;
      this.minimapBackgroundCtx = this.minimapBackgroundCanvas.getContext("2d")!;
   }

   public static setEntityCanvas(minimapEntityCanvas: HTMLCanvasElement): void {
      this.minimapEntityCanvas = minimapEntityCanvas;
      this.minimapEntityCtx = this.minimapEntityCanvas.getContext("2d")!;
   }

   public static setup(): void {
      const container = document.getElementById("minimap")!;

      container.style.width = this.SIZE + "px";
      container.style.height = this.SIZE + "px";

      container.style.left = this.MARGIN + "px";
      container.style.bottom = this.MARGIN + "px";

      this.minimapBackgroundCanvas.width = this.SIZE;
      this.minimapBackgroundCanvas.height = this.SIZE;

      this.minimapEntityCanvas.width = this.SIZE;
      this.minimapEntityCanvas.height = this.SIZE;
   }

   public static drawBackground(): void {
      const imageData = this.minimapBackgroundCtx.createImageData(this.SIZE, this.SIZE);

      for (let y = 0; y < this.SIZE; y++) {
         for (let x = 0; x < this.SIZE; x++) {
            const [r, g, b, a] = getTilePixelData(this.SIZE, x, y);

            const pixelIdx = getPixelIndex(this.SIZE, x, y);
            imageData.data[pixelIdx] = r;
            imageData.data[pixelIdx + 1] = g;
            imageData.data[pixelIdx + 2] = b;
            imageData.data[pixelIdx + 3] = a;
         }
      }

      this.minimapBackgroundCtx.putImageData(imageData, 0, 0);
   }

   public static getPositionInMinimap(position: Point): Point {
      const units = Board.dimensions * Board.tileSize;

      const x = position.x / units * this.SIZE;
      const y = position.y / units * this.SIZE;

      return new Point(x, y);
   }

   public static drawEntities(playerPosition: Point): void {
      const ctx = this.minimapEntityCtx;

      ctx.clearRect(0, 0, this.SIZE, this.SIZE);

      const PLAYER_RADIUS = 7;
      const PLAYER_COLOUR = "red";

      const PLAYER_BORDER_WIDTH = 3;
      const PLAYER_BORDER_COLOUR = "#000";

      const playerPositionInCanvas = this.getPositionInMinimap(playerPosition);

      ctx.fillStyle = PLAYER_COLOUR;
      ctx.beginPath();
      ctx.arc(playerPositionInCanvas.x, playerPositionInCanvas.y, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Create the circle border
      ctx.lineWidth = PLAYER_BORDER_WIDTH;
      ctx.strokeStyle = PLAYER_BORDER_COLOUR;
      ctx.stroke();
   }
}

const getTilePixelData = (minimapSize: number, minimapX: number, minimapY: number): [number, number, number, number] => {
   /** Size of the board */
   const BOARD_SIZE = Board.dimensions;

   const tileX = Math.floor(minimapX * BOARD_SIZE / minimapSize);
   const tileY = Math.floor(minimapY * BOARD_SIZE / minimapSize);

   // Fog of war
   if (SETTINGS.showFogOfWar) {
      const chunkX = Math.floor(tileX / Board.chunkSize);
      const chunkY = Math.floor(tileY / Board.chunkSize);
      const fogAmount = Board.getFog(chunkX, chunkY);
      if (fogAmount === 1) return [0, 0, 0, 255];
   }

   const tile = Board.getTile(tileX, tileY);
   const tileInfo = TILE_INFO[tile.kind];

   const rgb = new Colour(tileInfo.colour).getRGB();
   return [rgb[0], rgb[1], rgb[2], 255];
}

const getPixelIndex = (minimapSize: number, x: number, y: number): number => {
   return (y * minimapSize + x) * 4;
}

const MinimapCanvas = () => {
   const minimapBackgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
   const minimapEntityCanvasRef = useRef<HTMLCanvasElement | null>(null);

   useEffect(() => {
      if (minimapBackgroundCanvasRef.current !== null) {
         Minimap.setMinimapCanvas(minimapBackgroundCanvasRef.current);
      }

      if (minimapEntityCanvasRef.current !== null) {
         Minimap.setEntityCanvas(minimapEntityCanvasRef.current);
      }
   }, []);

   return <div id="minimap">
      <canvas className="background" ref={minimapBackgroundCanvasRef}></canvas>
      <canvas className="entities" ref={minimapEntityCanvasRef}></canvas>
   </div>;
}

export default MinimapCanvas;