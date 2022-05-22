import Board, { Chunk, Coordinates } from "../Board";
import Component from "../Component";
import Entity from "../entities/Entity";
import SETTINGS from "../settings";
import TILE_INFO from "../tile-types";
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

   private readonly isStatic: boolean;

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
      const tileKind = Board.getTile(...this.getTileCoordinates()).kind;
      const tileInfo = TILE_INFO[tileKind];
      if (typeof tileInfo.effects !== "undefined" && typeof tileInfo.effects.moveSpeedMultiplier !== "undefined") {
         velocity.magnitude *= tileInfo.effects.moveSpeedMultiplier;
      }

      this.position = this.position.add(velocity.convertToPoint());

      if (this.knockbackTime > 0) {
         // Apply knockback
         this.position = this.position.add(this.knockback);

         this.knockbackTime -= 1 / SETTINGS.tps;
      }

      if (hitboxComponent !== null) {
         // If the entity is intersecting with a wall tile, move it out of the collision
         const tileCollisions = this.getTileCollisions();
         if (tileCollisions.length > 0) this.resolveTileCollisions(tileCollisions);
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
      
      return [x, y];
   }

   private getTileCollisions(): Array<Coordinates> {
      const hitbox = this.getEntity().getComponent(HitboxComponent)!;

      const collisions = new Array<Coordinates>();

      switch (hitbox.hitboxInfo.type) {
         case "circle": {
            const hitboxRadius = hitbox.hitboxInfo.radius;

            const minTileX = Math.max(Math.floor(this.position.x / Board.tileSize - hitboxRadius), 0);
            const maxTileX = Math.min(Math.floor(this.position.x / Board.tileSize + hitboxRadius), Board.dimensions - 1);
            
            const minTileY = Math.max(Math.floor(this.position.y / Board.tileSize - hitboxRadius), 0);
            const maxTileY = Math.min(Math.floor(this.position.y / Board.tileSize + hitboxRadius), Board.dimensions - 1);

            for (let x = minTileX; x <= maxTileX; x++) {
               for (let y = minTileY; y <= maxTileY; y++) {
                  const tile = Board.getTile(x, y);
                  if (!tile.isWall) continue;

                  const xDist = Math.abs(this.position.x - (x + 0.5) * Board.tileSize);
                  const yDist = Math.abs(this.position.y - (y + 0.5) * Board.tileSize);

                  if (xDist <= hitboxRadius * Board.tileSize || yDist <= hitboxRadius * Board.tileSize) {
                     collisions.push([x, y]);
                     continue;
                  }

                  const cornerDistance = Math.sqrt(Math.pow(xDist, 2) + Math.pow(yDist, 2));

                  if (cornerDistance <= Math.sqrt(Math.pow(Board.tileSize, 2) / 2) + hitboxRadius * Board.tileSize) {
                     collisions.push([x, y]);
                  }
               }
            }
         }
      }

      return collisions;
   }

   private resolveTileCollisions(collisions: ReadonlyArray<Coordinates>): void {
      const hitboxInfo = this.getEntity().getComponent(HitboxComponent)!.hitboxInfo;

      for (const [x, y] of collisions) {
         const xDist = this.position.x - x * Board.tileSize;
         const yDist = this.position.y - y * Board.tileSize;

         const xDir = xDist >= 0 ? 1 : -1;
         const yDir = yDist >= 0 ? 1 : -1;

         const xDistFromEdge = Math.abs(xDist - Board.tileSize/2);
         const yDistFromEdge = Math.abs(yDist - Board.tileSize/2);

         const moveAxis: "x" | "y" = yDistFromEdge >= xDistFromEdge ? "y" : "x";

         switch (hitboxInfo.type) {
            case "circle": {
               if (moveAxis === "x") {
                  this.position.x = (x + 0.5 + 0.5 * xDir) * Board.tileSize + hitboxInfo.radius * Board.tileSize * xDir;
               } else {
                  this.position.y = (y + 0.5 + 0.5 * yDir) * Board.tileSize + hitboxInfo.radius * Board.tileSize * yDir;
               }
            }
         }
      }
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
    * @param strength The strength of the knockback. 1 = regular kb
    */
   public applyKnockback(source: Point, strength: number = 1): void {
      const angle = source.angleBetween(this.position);

      const kb = strength * 10;

      const knockbackVector = new Vector(kb * Board.tileSize / SETTINGS.tps, angle);
      this.knockback = knockbackVector.convertToPoint();
      this.knockbackTime = Entity.iframes / SETTINGS.tps;
   }
}

export default TransformComponent;