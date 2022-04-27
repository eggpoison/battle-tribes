import Board, { Chunk, TileCoordinates } from "../Board";
import Component from "../Component";
import Entity from "../Entity";
import { Point, Vector } from "../utils";
import HitboxComponent from "./HitboxComponent";

class TransformComponent extends Component {
   /** Position of the entity */
   public position: Point;
   /** Velocity of the entity */
   public velocity: Vector;
   /** Rotation of the entity in degrees */
   public rotation: number;

   constructor(startingPosition: Point, startingVelocity: Vector = new Vector(0, 0), startingRotation: number = 0) {
      super();

      this.position = startingPosition;
      this.velocity = startingVelocity;
      this.rotation = startingRotation;
   }

   public tick(): void {
      // If the entity has a hitbox, check if it will collide first
      const entity = this.getEntity();
      if (entity.hasComponent(HitboxComponent)) {
         const hitboxComponent = entity.getComponent(HitboxComponent)!;

         if (hitboxComponent.willCollideWithWall()) return;
      }
      
      const positionAdd = this.velocity.convertToPoint();
      this.position = this.position.add(positionAdd);
   }

   public getChunk(): Chunk | null {
      const chunkX = Math.floor(this.position.x / (Board.tileSize * Board.size));
      const chunkY = Math.floor(this.position.y / (Board.tileSize * Board.size));

      return Board.getChunk(chunkX, chunkY);
   }

   public static getRandomPositionInTile(tileCoordinates: TileCoordinates): Point {
      const x = tileCoordinates[0] * Board.tileSize + Board.tileSize * Math.random();
      const y = tileCoordinates[1] * Board.tileSize + Board.tileSize * Math.random();

      return new Point(x, y);
   }

   public static getNearbyEntities(position: Point, radius: number): Array<Entity> {
      const unitsPerChunk = Board.tileSize * Board.chunkSize;

      const minChunkX = Math.max(Math.floor((position.x - radius) / unitsPerChunk), 0);
      const minChunkY = Math.min(Math.floor((position.y - radius) / unitsPerChunk), Board.size - 1);

      const maxChunkX = Math.max(Math.floor((position.x + radius) / unitsPerChunk), 0);
      const maxChunkY = Math.min(Math.floor((position.y + radius) / unitsPerChunk), Board.size - 1);

      const nearbyEntities = new Array<Entity>();

      for (let y = minChunkY; y <= maxChunkY; y++) {
         for (let x = minChunkX; x <= maxChunkX; x++) {
            const chunk = Board.getChunk(x, y);
            if (chunk === null) continue;
            
            for (const entity of chunk) {
               const hitboxComponent = entity.getComponent(HitboxComponent);
               if (hitboxComponent !== null) {
                  const entityPosition = entity.getComponent(TransformComponent)!.position;

                  switch (hitboxComponent.hitboxInfo.type) {
                     case "circle": {
                        if (position.distanceFrom(entityPosition) - hitboxComponent.hitboxInfo.radius <= radius) {
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
}

export default TransformComponent;