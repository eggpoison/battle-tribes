import Board, { Chunk } from "../Board";
import Component from "../Component";
import Entity from "../entities/Entity";
import Cow from "../entities/mobs/Cow";
import SETTINGS from "../settings";
import TILE_INFO_MAP, { TileType } from "../tiles";
import { Point, randFloat, Vector } from "../utils";
import HitboxComponent from "./HitboxComponent";

let a: any;

class TransformComponent extends Component {
   /** Position of the entity */
   public _position!: Point;
   /** Velocity of the entity */
   public velocity: Vector;
   /** Rotation of the entity in degrees */
   public rotation: number;

   private knockback!: Point;
   private knockbackTime: number = 0;

   private readonly isStatic: boolean;

   set position(a: Point) {
      this._position = a;
   }
   get position() {
      return this._position;
   }

   constructor(startingPosition?: Point, startingVelocity: Vector = new Vector(0, 0), startingRotation: number = 0, isStatic: boolean = false) {
      super();

      if (typeof startingPosition !== "undefined") this.position = startingPosition;
      this.velocity = startingVelocity;
      this.rotation = startingRotation;
      this.isStatic = isStatic;
   }

   public tick(): void {
      if (this.isStatic) return;

      // If the entity is going to collide into a wall, don't move
      const entity = this.getEntity();
      const hitboxComponent = entity.getComponent(HitboxComponent);
      if (hitboxComponent !== null && hitboxComponent.willCollideWithWall()) return;

      const velocity = this.velocity.copy();

      // Apply tile slowness
      const tileType = Board.getTileType(...this.getTileCoordinates());
      const tileInfo = TILE_INFO_MAP.get(tileType)!;
      if (typeof tileInfo.effects !== "undefined" && typeof tileInfo.effects.moveSpeedMultiplier !== "undefined") {
         velocity.magnitude *= tileInfo.effects.moveSpeedMultiplier;
      }

      this.position = this.position.add(velocity.convertToPoint());

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
      const chunkX = Math.floor(this.position.x / (Board.tileSize * Board.chunkSize));
      const chunkY = Math.floor(this.position.y / (Board.tileSize * Board.chunkSize));

      return Board.getChunk(chunkX, chunkY);
   }

   private getTileCoordinates(): [number, number] {
      const x = Math.floor(this.position.x / Board.tileSize);
      const y = Math.floor(this.position.y / Board.tileSize);

      a = this;
      
      return [x, y];
   }

   public static getNearbyEntities(position: Point, radius: number): Array<Entity> {
      const units = Board.tileSize * Board.chunkSize;

      const minChunkX = Math.max(Math.floor((position.x - radius) / units), 0);
      const maxChunkX = Math.max(Math.floor((position.x + radius) / units), 0);
      
      const minChunkY = Math.min(Math.floor((position.y - radius) / units), Board.size - 1);
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