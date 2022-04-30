import Board from "../Board";
import Component from "../Component";
import Entity from "../entities/Entity";
import TransformComponent from "./TransformComponent";

interface BaseHitboxInfo {
   readonly type: "rectangle" | "circle";
}

export interface RectangleHitboxInfo extends BaseHitboxInfo {
   readonly type: "rectangle";
   readonly width: number;
   readonly height: number;
}

export interface CircleHitboxInfo extends BaseHitboxInfo {
   readonly type: "circle";
   readonly radius: number;
}

export type HitboxInfo = CircleHitboxInfo | RectangleHitboxInfo;

class HitboxComponent extends Component {
   public readonly entitiesInCollision: Array<Entity> = [];

   public readonly hitboxInfo: HitboxInfo;

   constructor(hitboxInfo: HitboxInfo) {
      super();

      this.hitboxInfo = hitboxInfo;
   }

   public getCollisions(): Array<Entity> | null {
      const entity = this.getEntity();
      const position = entity.getComponent(TransformComponent)!.position;

      let radius: number;
      if (this.hitboxInfo.type === "circle") {
         radius = this.hitboxInfo.radius;
      } else {
         radius = Math.max(this.hitboxInfo.width, this.hitboxInfo.height);
      }

      let collidingEntities = TransformComponent.getNearbyEntities(position, radius * Board.tileSize);

      // Remove the entity
      for (let i = 0; i < collidingEntities.length; i++) {
         if (collidingEntities[i] === entity) {
            collidingEntities.splice(i, 1);
            break;
         }
      }

      if (collidingEntities.length > 0) {
         return collidingEntities;
      }
      return null;
   }

   public willCollideWithWall(): boolean {
      // Get the next position
      const transformComponent = this.getEntity().getComponent(TransformComponent)!;
      const currentPosition = transformComponent.position;
      const nextPosition = currentPosition.add(transformComponent.velocity.convertToPoint());

      // Check if the entity will collide with the wall
      switch (this.hitboxInfo.type) {
         case "circle": {
            if (nextPosition.x + this.hitboxInfo.radius * Board.tileSize > Board.dimensions * Board.tileSize) return true;
            if (nextPosition.x - this.hitboxInfo.radius * Board.tileSize < 0) return true;
            if (nextPosition.y + this.hitboxInfo.radius * Board.tileSize > Board.dimensions * Board.tileSize) return true;
            if (nextPosition.y - this.hitboxInfo.radius * Board.tileSize < 0) return true;
            break;
         }
         case "rectangle": {
            if (nextPosition.x + this.hitboxInfo.width / 2 * Board.tileSize > Board.dimensions * Board.tileSize) return true;
            if (nextPosition.x - this.hitboxInfo.width / 2 * Board.tileSize < 0) return true;
            if (nextPosition.y + this.hitboxInfo.height / 2 * Board.tileSize > Board.dimensions * Board.tileSize) return true;
            if (nextPosition.y - this.hitboxInfo.height / 2 * Board.tileSize < 0) return true;
            break;
         }
      }

      return false;
   }
}

export default HitboxComponent;