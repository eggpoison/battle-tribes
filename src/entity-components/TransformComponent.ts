import Board, { Coordinates } from "../Board";
import Component from "../Component";
import Entity from "../entities/Entity";
import SETTINGS from "../settings";
import TILE_INFO from "../data/tile-types";
import { Point, Vector } from "../utils";
import HitboxComponent from "./HitboxComponent";
import StatusEffectComponent from "../components/StatusEffectComponent";
import Chunk from "../Chunk";

class TransformComponent extends Component {
   /** How much an entity's velocity gets decreased each second (tiles per second) */
   private static readonly FRICTION_CONSTANT = 0.5;

   /** Position of the entity */
   public position!: Point;
   /** Velocity of the entity (tiles per second) */
   public velocity: Vector | null = null;
   /** Acceleration of the entity (tiles per second) */
   public acceleration: Vector | null = null;
   /** Rotation of the entity in degrees */
   public rotation: number = 0;

   /** Limit to how fast the entity can go (tiles per second) */
   public terminalVelocity: number = 0;

   private knockback!: Point;
   private knockbackTime: number = 0;

   private readonly isStatic: boolean;

   public isMoving: boolean = false;

   constructor(startingPosition?: Point, isStatic: boolean = false) {
      super();

      if (typeof startingPosition !== "undefined") this.position = startingPosition;

      this.isStatic = isStatic;
   }

   public tick(): void {
      if (this.isStatic) return;

      const tile = Board.getTile(...this.getTileCoordinates());
      const tileInfo = TILE_INFO[tile.kind];

      // Apply acceleration
      if (this.acceleration !== null) {
         const acceleration = this.acceleration.copy();
         acceleration.magnitude /= SETTINGS.tps;

         // Add acceleration to velocity
         if (this.velocity === null) {
            this.velocity = acceleration;
         } else {
            this.velocity = this.velocity.add(acceleration);
         }
      }
      else if (!this.isMoving && this.velocity !== null) {
         // Apply friction
         this.velocity.magnitude -= tileInfo.friction * TransformComponent.FRICTION_CONSTANT * Board.tileSize / SETTINGS.tps;
         if (this.velocity.magnitude < 0) this.velocity = null;
      }

      // Terminal velocity
      if (this.velocity !== null && this.velocity.magnitude > this.terminalVelocity) {
         this.velocity.magnitude = this.terminalVelocity;
      }

      // Apply velocity
      if (this.velocity !== null) {
         const velocity = this.velocity.copy();
         
         // Apply tile slowness to velocity
         if (typeof tileInfo.effects?.moveSpeedMultiplier !== "undefined") {
            velocity.magnitude *= tileInfo.effects.moveSpeedMultiplier;
         }
         
         this.position = this.position.add(velocity.convertToPoint());
      }

      // Apply status effects
      if (typeof tileInfo.effects?.statusEffectOnWalk !== "undefined") {
         const { type, duration } = tileInfo.effects.statusEffectOnWalk;

         const statusEffectComponent = this.getEntity().getComponent(StatusEffectComponent);
         if (statusEffectComponent !== null) {
            statusEffectComponent.applyStatusEffect(type, duration);
         }
      }

      if (this.knockbackTime > 0) {
         // Add knockback
         this.position = this.position.add(this.knockback);

         this.knockbackTime -= 1 / SETTINGS.tps;
      }

      const hitboxComponent = this.getEntity().getComponent(HitboxComponent);
      if (hitboxComponent !== null) {
         // If the entity is intersecting with a wall tile, move it out of the collision
         const tileCollisions = this.getTileCollisions();
         if (tileCollisions.length > 0) this.resolveTileCollisions(tileCollisions);
      }

      // Resolve wall collisions
      this.resolveWallCollisions();
   }

   public setVelocity(velocity: Vector): void {
      this.isMoving = true;
      
      this.velocity = velocity;
   }

   public stopMoving(): void {
      this.isMoving = false;
   }

   public getChunk(): Chunk | null {
      const chunkX = Math.floor(this.position.x / (Board.tileSize * Board.chunkSize));
      const chunkY = Math.floor(this.position.y / (Board.tileSize * Board.chunkSize));

      return Board.getChunk(chunkX, chunkY);
   }

   public getTileCoordinates(): Coordinates {
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

   private resolveWallCollisions(): void {
      const units = Board.dimensions * Board.tileSize;

      const hitboxComponent = this.getEntity().getComponent(HitboxComponent)!;
      if (hitboxComponent === null) return;

      let width!: number;
      let height!: number;
      switch (hitboxComponent.hitboxInfo.type) {
         case "circle": {
            width = hitboxComponent.hitboxInfo.radius * 2 * Board.tileSize;
            height = hitboxComponent.hitboxInfo.radius * 2 * Board.tileSize;
            break;
         }
         case "rectangle": {
            width = hitboxComponent.hitboxInfo.width * Board.tileSize;
            height = hitboxComponent.hitboxInfo.height * Board.tileSize;
            break;
         }
      }

      if (this.position.x - width/2 < 0) this.position.x = width/2;
      if (this.position.x + width/2 > units) this.position.x = units - width/2;
      if (this.position.y - height/2 < 0) this.position.y = height/2;
      if (this.position.y + height/2 > units) this.position.y = units - height/2;
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