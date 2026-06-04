import { boxIsWithinRange } from "../../shared/dist/boxes.js";
import { Entity } from "../../shared/dist/entities.js";
import { Settings } from "../../shared/dist/settings.js";
import { distance, positionIsInWorld } from "../../shared/dist/utils.js";
import { TransformComponentArray } from "./components/TransformComponent.js";
import Layer from "./Layer.js";

export function getDistanceToClosestEntity(layer: Layer, x: number, y: number): number {
   let minDistance = 2000;

   const minChunkX = Math.max(Math.min(Math.floor((x - 2000) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((x + 2000) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((y - 2000) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((y + 2000) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);

   const checkedEntities = new Set<Entity>();
   
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            if (checkedEntities.has(entity)) continue;
            
            const transformComponent = TransformComponentArray.getComponent(entity);
            // @HACK
            const hitbox = transformComponent.hitboxes[0];
            
            const dist = distance(x, y, hitbox.box.posX, hitbox.box.posY);
            if (dist <= minDistance) {
               minDistance = dist;
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
   
   const chunkX = Math.floor(x / Settings.CHUNK_UNITS);
   const chunkY = Math.floor(y / Settings.CHUNK_UNITS);

   const entities: Array<Entity> = [];
   
   const chunk = layer.getChunk(chunkX, chunkY);
   for (const entity of chunk.entities) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      for (const hitbox of transformComponent.hitboxes) {
         if (boxIsWithinRange(hitbox.box, x, y, 1)) {
            entities.push(entity);
            break;
         }
      }
   }

   return entities;
}