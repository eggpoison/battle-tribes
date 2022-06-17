import Board from "./Board";
import { getCanvasHeight, getCanvasWidth } from "./components/Canvas";
import Entity from "./entities/Entity";
import TransformComponent from "./entity-components/TransformComponent";
import { Point } from "./utils";

abstract class Camera {
   /** Larger = zoomed in, smaller = zoomed out */
   public static zoom: number = 1;

   public static position: Point;

   private static followedEntity: Entity;

   private static readonly visibleChunkBounds: [number, number, number, number] = [0, 0, 0, 0];

   public static setup(): void {
      this.position = new Point(0, 0);
   }

   public static tick(): void {
      // Number of units in a chunk
      const chunkUnits = Board.chunkSize * Board.tileSize;

      // minX
      this.visibleChunkBounds[0] = Math.max(Math.floor((this.position.x - getCanvasWidth() / 2) / chunkUnits), 0);
      // maxX
      this.visibleChunkBounds[1] = Math.min(Math.ceil((this.position.x + getCanvasWidth() / 2) / chunkUnits), Board.size - 1);
      
      // minY
      this.visibleChunkBounds[2] = Math.max(Math.floor((this.position.y - getCanvasHeight() / 2) / chunkUnits), 0);
      // maxY
      this.visibleChunkBounds[3] = Math.min(Math.ceil((this.position.y + getCanvasHeight() / 2) / chunkUnits), Board.size - 1);
   }

   public static getVisibleChunkBounds(): [number, number, number, number] {
      return this.visibleChunkBounds;
   }

   public static chunkIsVisible(x: number, y: number): boolean {
      return x >= this.visibleChunkBounds[0] && x <= this.visibleChunkBounds[1] && y >= this.visibleChunkBounds[2] && y <= this.visibleChunkBounds[3];
   }

   public static updateCameraPosition(): void {
      if (typeof this.followedEntity !== "undefined") {
         const followedEntityPoistion = this.followedEntity.getComponent(TransformComponent)!.position;
         this.position = new Point(followedEntityPoistion.x, followedEntityPoistion.y);
      }
   }

   public static getXPositionInCamera(xPos: number): number {
      return xPos - this.position.x + getCanvasWidth() / 2;
   }
   public static getYPositionInCamera(yPos: number): number {
      return yPos - this.position.y + getCanvasHeight() / 2;
   }

   public static followEntity(entity: Entity): void {
      this.followedEntity = entity;
   }

   public static pointIsVisible(point: Point): boolean {
      const unitsInChunk = Board.tileSize * Board.chunkSize;

      const pointChunkX = Math.floor(point.x / unitsInChunk);
      const pointChunkY = Math.floor(point.y / unitsInChunk);

      return pointChunkX >= this.visibleChunkBounds[0] && pointChunkX <= this.visibleChunkBounds[1] && pointChunkY >= this.visibleChunkBounds[2] && pointChunkY <= this.visibleChunkBounds[3];
   }
}

export default Camera;