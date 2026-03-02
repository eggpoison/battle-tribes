import { boxIsWithinRange } from "../../shared/src/boxes/boxes";
import { Entity } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import { Point, positionIsInWorld } from "../../shared/src/utils";
import { TransformComponentArray } from "./components/TransformComponent";
import Layer from "./Layer";

export function getDistanceToClosestEntity(layer: Layer, position: Point): number {
   let minDistance = 2000;

   const minChunkX = Math.max(Math.min(Math.floor((position.x - 2000) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((position.x + 2000) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((position.y - 2000) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((position.y + 2000) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);

   const checkedEntities = new Set<Entity>();
   
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            if (checkedEntities.has(entity)) continue;
            
            const transformComponent = TransformComponentArray.getComponent(entity);
            // @HACK
            const hitbox = transformComponent.hitboxes[0];
            
            const distance = position.distanceTo(hitbox.box.position);
            if (distance <= minDistance) {
               minDistance = distance;
            }

            checkedEntities.add(entity);
         }
      }
   }

   return minDistance;
}

export function getEntitiesAtPosition(layer: Layer, x: number, y: number): Array<Entity> {
   if (!positionIsInWorld(x, y)) {
      throw new Error("Position isn't in the board");
   }
   
   // @Speed: Garbage collection
   const testPosition = new Point(x, y);

   const chunkX = Math.floor(x / Settings.CHUNK_UNITS);
   const chunkY = Math.floor(y / Settings.CHUNK_UNITS);

   const entities = new Array<Entity>();
   
   const chunk = layer.getChunk(chunkX, chunkY);
   for (const entity of chunk.entities) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      for (const hitbox of transformComponent.hitboxes) {
         if (boxIsWithinRange(hitbox.box, testPosition, 1)) {
            entities.push(entity);
            break;
         }
      }
   }

   return entities;
}