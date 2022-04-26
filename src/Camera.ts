import { getCanvasHeight, getCanvasWidth } from "./components/Canvas";
import Entity from "./Entity";
import TransformComponent from "./entity-components/TransformComponent";
import { Point } from "./utils";

abstract class Camera {
   /** Larger = zoomed in, smaller = zoomed out */
   public static zoom: number = 1;

   public static position: Point;

   private static followedEntity: Entity;

   public static setup(): void {
      this.position = new Point(0, 0);
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