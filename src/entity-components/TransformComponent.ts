import Board, { Chunk } from "../Board";
import Component from "../Component";
import Entity from "../entities/Entity";
import SETTINGS from "../settings";
import { Point, Vector } from "../utils";
import HitboxComponent from "./HitboxComponent";

class TransformComponent extends Component {
   /** Position of the entity */
   public position!: Point;
   /** Velocity of the entity */
   public velocity: Vector;
   /** Rotation of the entity in degrees */
   public rotation: number;

   private knockback!: Point;
   private knockbackTime: number = 0;

   constructor(startingPosition?: Point, startingVelocity: Vector = new Vector(0, 0), startingRotation: number = 0) {
      super();

      if (typeof startingPosition !== "undefined") this.position = startingPosition;
      this.velocity = startingVelocity;
      this.rotation = startingRotation;
   }

   public tick(): void {
      // If the entity is going to collide into a wall, don't move
      const entity = this.getEntity();
      const hitboxComponent = entity.getComponent(HitboxComponent);
      if (hitboxComponent !== null && hitboxComponent.willCollideWithWall()) return;

      const velocityPoint = this.velocity.convertToPoint();

      this.position = this.position.add(velocityPoint);

      if (this.knockbackTime > 0) {
         // Apply knockback
         this.position = this.position.add(this.knockback);

         this.knockbackTime -= 1 / SETTINGS.tps;
      }
   }

   public setVelocity(velocity: Vector): void {
      this.velocity = velocity;
   }

   public stopVelocity(): void {
      this.velocity = new Vector(0, 0);
   }

   public getChunk(): Chunk | null {
      const chunkX = Math.floor(this.position.x / (Board.tileSize * Board.size));
      const chunkY = Math.floor(this.position.y / (Board.tileSize * Board.size));

      return Board.getChunk(chunkX, chunkY);
   }

   public static getNearbyEntities(position: Point, radius: number): Array<Entity> {
      const units = Board.tileSize * Board.size;

      const minChunkX = Math.max(Math.floor((position.x - radius) / units), 0);
      const minChunkY = Math.min(Math.floor((position.y - radius) / units), Board.size - 1);

      const maxChunkX = Math.max(Math.floor((position.x + radius) / units), 0);
      const maxChunkY = Math.min(Math.floor((position.y + radius) / units), Board.size - 1);

      const nearbyEntities = new Array<Entity>();

      for (let y = minChunkY; y <= maxChunkY; y++) {
         for (let x = minChunkX; x <= maxChunkX; x++) {
            const chunk = Board.getChunk(x, y);
            if (chunk === null) continue;
            
            for (const entity of chunk) {
               const hitboxComponent = entity.getComponent(HitboxComponent);
               if (hitboxComponent !== null) {
                  const entityPosition = entity.getComponent(TransformComponent)!.position;

                  const hitboxInfo = hitboxComponent.hitboxInfo;
                  switch (hitboxInfo.type) {
                     case "circle": {
                        if (position.distanceFrom(entityPosition) - hitboxInfo.radius * Board.tileSize <= radius) {
                           nearbyEntities.push(entity);
                        }
                        break;
                     }
                     case "rectangle": {
                        const dist = position.distanceFromRectangle(
                           entityPosition.x - hitboxInfo.width / 2 * Board.tileSize,
                           entityPosition.x + hitboxInfo.width / 2 * Board.tileSize,
                           entityPosition.y - hitboxInfo.height / 2 * Board.tileSize,
                           entityPosition.y + hitboxInfo.height / 2 * Board.tileSize);
                        if (dist <= radius) {
                           nearbyEntities.push(entity);
                        }
                        break;
                     }
                  }
               }
            }
         }
      }

      return nearbyEntities;
   }

   /**
    * @param source The source of the knockback
    * @param strength How many blocks the knockback will move the entity in a second
    */
   public applyKnockback(source: Point, strength: number): void {
      const angle = source.angleBetween(this.position);

      const knockbackVector = new Vector(strength * Board.tileSize / SETTINGS.tps, angle);
      this.knockback = knockbackVector.convertToPoint();
      this.knockbackTime = Entity.iframes / SETTINGS.tps;
   }
}

export default TransformComponent;