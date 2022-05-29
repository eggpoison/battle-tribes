import { useEffect, useRef } from "react";
import Board, { Coordinates } from "../Board";
import Player from "../entities/tribe-members/Player";
import TribeStash from "../entities/TribeStash";
import TransformComponent from "../entity-components/TransformComponent";
import SETTINGS from "../settings";
import TILE_INFO, { TileKind } from "../tile-types";
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

   private static previousBackgroundImageData: ImageData;

   private static tileColours: Partial<Record<TileKind, [number, number, number]>> = {};

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
            const [r, g, b, a] = this.getTilePixelData(x, y);

            const pixelIdx = getPixelIndex(this.SIZE, x, y);
            imageData.data[pixelIdx] = r;
            imageData.data[pixelIdx + 1] = g;
            imageData.data[pixelIdx + 2] = b;
            imageData.data[pixelIdx + 3] = a;
         }
      }

      this.minimapBackgroundCtx.putImageData(imageData, 0, 0);
      this.previousBackgroundImageData = imageData;
   }

   public static updateBackground(changedTiles: Array<Coordinates>): void {
      for (const [x, y] of changedTiles) {
         const minimapX = Math.floor(x / Board.dimensions * this.SIZE);
         const minimapY = Math.floor(y / Board.dimensions * this.SIZE);

         // Fill in gaps (left)
         const previousMinimapX = Math.floor((x - 1) / Board.dimensions * this.SIZE);
         if (x > 0 && minimapX - previousMinimapX > 1) {
            const gapX = previousMinimapX + 1;

            const [r, g, b, a] = this.getTilePixelData(gapX, minimapY);

            const pixelIdx = getPixelIndex(this.SIZE, gapX, minimapY);
            this.previousBackgroundImageData.data[pixelIdx] = r;
            this.previousBackgroundImageData.data[pixelIdx + 1] = g;
            this.previousBackgroundImageData.data[pixelIdx + 2] = b;
            this.previousBackgroundImageData.data[pixelIdx + 3] = a;
         }
         // Fill in gaps (top)
         const previousMinimapY = Math.floor((y - 1) / Board.dimensions * this.SIZE);
         if (y > 0 && minimapY - previousMinimapY > 1) {
            const gapY = previousMinimapY + 1;

            const [r, g, b, a] = this.getTilePixelData(minimapX, gapY);

            const pixelIdx = getPixelIndex(this.SIZE, minimapX, gapY);
            this.previousBackgroundImageData.data[pixelIdx] = r;
            this.previousBackgroundImageData.data[pixelIdx + 1] = g;
            this.previousBackgroundImageData.data[pixelIdx + 2] = b;
            this.previousBackgroundImageData.data[pixelIdx + 3] = a;
         }
         // Fill in gaps (top left)
         if (x > 0 && y > 0 && minimapX - previousMinimapX > 1 && minimapY - previousMinimapY > 1) {
            const gapX = previousMinimapX + 1;
            const gapY = previousMinimapY + 1;

            const [r, g, b, a] = this.getTilePixelData(gapX, gapY);

            const pixelIdx = getPixelIndex(this.SIZE, gapX, gapY);
            this.previousBackgroundImageData.data[pixelIdx] = r;
            this.previousBackgroundImageData.data[pixelIdx + 1] = g;
            this.previousBackgroundImageData.data[pixelIdx + 2] = b;
            this.previousBackgroundImageData.data[pixelIdx + 3] = a;
         }

         const [r, g, b, a] = this.getTilePixelData(minimapX, minimapY);

         const pixelIdx = getPixelIndex(this.SIZE, minimapX, minimapY);
         this.previousBackgroundImageData.data[pixelIdx] = r;
         this.previousBackgroundImageData.data[pixelIdx + 1] = g;
         this.previousBackgroundImageData.data[pixelIdx + 2] = b;
         this.previousBackgroundImageData.data[pixelIdx + 3] = a;
      }

      this.minimapBackgroundCtx.putImageData(this.previousBackgroundImageData, 0, 0);
   }

   public static getPositionInMinimap(position: Point): Point {
      const units = Board.dimensions * Board.tileSize;

      const x = position.x / units * this.SIZE;
      const y = position.y / units * this.SIZE;

      return new Point(x, y);
   }

   public static drawEntities(): void {
      const ctx = this.minimapEntityCtx;

      ctx.clearRect(0, 0, this.SIZE, this.SIZE);

      const playerTribe = Player.instance.tribe;
      for (const tribeMember of playerTribe.members) {
         const position = tribeMember.getComponent(TransformComponent)!.position;
         const positionInCanvas = this.getPositionInMinimap(position);

         if (tribeMember instanceof Player) {
            const PLAYER_RADIUS = 7;
            const PLAYER_COLOUR = "#f5ff36";
      
            const PLAYER_BORDER_WIDTH = 3;
            const PLAYER_BORDER_COLOUR = "#000";
      
            ctx.fillStyle = PLAYER_COLOUR;
            ctx.beginPath();
            ctx.arc(positionInCanvas.x, positionInCanvas.y, PLAYER_RADIUS, 0, Math.PI * 2);
            ctx.fill();
      
            // Create the circle border
            ctx.lineWidth = PLAYER_BORDER_WIDTH;
            ctx.strokeStyle = PLAYER_BORDER_COLOUR;
            ctx.stroke();
         } else if (tribeMember instanceof TribeStash) {
            const ICON_SIZE = 15;
            const ICON_COLOUR = "red";

            const BORDER_WIDTH = 2;
            const BORDER_COLOUR = "#000";

            ctx.fillStyle = ICON_COLOUR;
            ctx.fillRect(positionInCanvas.x - ICON_SIZE/2, positionInCanvas.y - ICON_SIZE/2, ICON_SIZE, ICON_SIZE);
            
            // Draw border
            ctx.lineWidth = BORDER_WIDTH;
            ctx.strokeStyle = BORDER_COLOUR;

            ctx.beginPath();

            // Top left
            ctx.moveTo(positionInCanvas.x - ICON_SIZE/2, positionInCanvas.y - ICON_SIZE/2);
            // Top right
            ctx.lineTo(positionInCanvas.x + ICON_SIZE/2, positionInCanvas.y - ICON_SIZE/2);
            // Bottom right
            ctx.lineTo(positionInCanvas.x + ICON_SIZE/2, positionInCanvas.y + ICON_SIZE/2);
            // Bottom left
            ctx.lineTo(positionInCanvas.x - ICON_SIZE/2, positionInCanvas.y + ICON_SIZE/2);
            // Top left
            ctx.lineTo(positionInCanvas.x - ICON_SIZE/2, positionInCanvas.y - ICON_SIZE/2);

            ctx.stroke();
         }
      }
   }

   private static getTilePixelData(minimapX: number, minimapY: number): [number, number, number, number] {
      const tileX = Math.floor(minimapX * Board.dimensions / this.SIZE);
      const tileY = Math.floor(minimapY * Board.dimensions / this.SIZE);
   
      const tile = Board.getTile(tileX, tileY);
   
      // Fog of war
      const darknessMultiplier = SETTINGS.showFogOfWar ? 1 - tile.fogAmount : 1;
   
      let rgb!: [number, number, number];
      // If the colour for the tile has already been calculated, use the existing value
      if (this.tileColours.hasOwnProperty(tile.kind)) {
         rgb = this.tileColours[tile.kind]!;
      } else {
         const tileInfo = TILE_INFO[tile.kind];
         rgb = new Colour(tileInfo.colour).getRGB();

         this.tileColours[tile.kind] = rgb;
      }
   
      return [rgb[0] * darknessMultiplier, rgb[1] * darknessMultiplier, rgb[2] * darknessMultiplier, 255];
   }
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