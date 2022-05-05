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
      this.visibleChunkBounds[0] = Math.floor((this.position.x - getCanvasWidth() / 2) / chunkUnits);
      // maxX
      this.visibleChunkBounds[1] = Math.ceil((this.position.x + getCanvasWidth() / 2) / chunkUnits) + 1;
      
      // minY
      this.visibleChunkBounds[2] = Math.floor((this.position.y - getCanvasWidth() / 2) / chunkUnits);
      // maxY
      this.visibleChunkBounds[3] = Math.ceil((this.position.y + getCanvasHeight() / 2) / chunkUnits) + 1;
      // console.log(this.visibleChunkBounds);
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
}

export default Camera;