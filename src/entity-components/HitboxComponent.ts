import Board from "../Board";
import Camera from "../Camera";
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

   public hitboxInfo!: HitboxInfo;

   public setHitbox(hitbox: HitboxInfo): void {
      this.hitboxInfo = hitbox;
   }

   public getCollidingEntities(): Array<Entity> {
      return this.entitiesInCollision;
   }

   public tick(): void {
      const entity = this.getEntity();

      // Check collisions
      const hasCollisionFunc = typeof entity.onCollision !== "undefined";
      const hasLeaveCollisionFunc = typeof entity.onLeaveCollision !== "undefined";
      const hasDuringCollisionFunc = typeof entity.duringCollision !== "undefined";

      if (hasCollisionFunc || hasLeaveCollisionFunc || hasDuringCollisionFunc) {
         let newCollidingEntities: Array<Entity> = [];

         const collidingEntities = this.getCollisions();
         if (collidingEntities !== null) {
            newCollidingEntities = collidingEntities;
         }

         const unseenEntities = this.entitiesInCollision.slice();
         for (const collidingEntity of newCollidingEntities) {
            // If the entity was not previously in a collision
            if (!this.entitiesInCollision.includes(collidingEntity)) {
               if (hasCollisionFunc) entity.onCollision!(collidingEntity);
               this.entitiesInCollision.push(collidingEntity);
            } else {
               unseenEntities.splice(unseenEntities.indexOf(collidingEntity), 1);
            }
         }

         for (const unseenEntity of unseenEntities) {
            if (hasLeaveCollisionFunc) entity.onLeaveCollision!(unseenEntity);
            this.entitiesInCollision.splice(this.entitiesInCollision.indexOf(unseenEntity), 1);
         }

         if (hasDuringCollisionFunc) {
            for (const collidingEntity of this.entitiesInCollision) {
               entity.duringCollision!(collidingEntity);
            }
         }
      }
   }

   public getCollisions(): Array<Entity> | null {
      const entity = this.getEntity();
      const position = entity.getComponent(TransformComponent)!.position;

      let radius: number;
      if (this.hitboxInfo.type === "circle") {
         radius = this.hitboxInfo.radius;
      } else {
         radius = Math.max(this.hitboxInfo.width, this.hitboxInfo.height) / 2;
      }

      let collidingEntities = Board.getEntitiesInRange(position, radius * Board.tileSize);

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

   public drawHitbox(ctx: CanvasRenderingContext2D): void {
      const HITBOX_WIDTH = 2;
      const HITBOX_COLOUR = "red";

      const position = this.getEntity().getComponent(TransformComponent)!.position;

      ctx.lineWidth = HITBOX_WIDTH;
      ctx.strokeStyle = HITBOX_COLOUR;

      switch (this.hitboxInfo.type) {
         case "circle": {
            ctx.beginPath();
            ctx.arc(Camera.getXPositionInCamera(position.x), Camera.getYPositionInCamera(position.y), this.hitboxInfo.radius * Board.tileSize, 0, Math.PI * 2);
            ctx.stroke();
            break;
         }
         case "rectangle": {
            const measurements = [-this.hitboxInfo.width / 2, this.hitboxInfo.width / 2, -this.hitboxInfo.height / 2, this.hitboxInfo.height / 2];
 
            ctx.beginPath();
            ctx.moveTo(Camera.getXPositionInCamera(position.x + measurements[0] * Board.tileSize), Camera.getYPositionInCamera(position.y + measurements[2] * Board.tileSize));

            ctx.lineTo(Camera.getXPositionInCamera(position.x + measurements[1] * Board.tileSize), Camera.getYPositionInCamera(position.y + measurements[2] * Board.tileSize));
            ctx.lineTo(Camera.getXPositionInCamera(position.x + measurements[1] * Board.tileSize), Camera.getYPositionInCamera(position.y + measurements[3] * Board.tileSize));
            ctx.lineTo(Camera.getXPositionInCamera(position.x + measurements[0] * Board.tileSize), Camera.getYPositionInCamera(position.y + measurements[3] * Board.tileSize));
            ctx.lineTo(Camera.getXPositionInCamera(position.x + measurements[0] * Board.tileSize), Camera.getYPositionInCamera(position.y + measurements[2] * Board.tileSize));

            ctx.stroke();

            break;
         }
      }
   }
}

export default HitboxComponent;