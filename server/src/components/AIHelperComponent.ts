import { circlesDoIntersect, circleAndRectangleDoIntersect } from "webgl-test-shared/dist/collision";
import { AIHelperComponentData } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import Chunk from "../Chunk";
import Entity from "../Entity";
import Board from "../Board";
import Hitbox from "../hitboxes/Hitbox";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { ComponentArray } from "./ComponentArray";

export class AIHelperComponent {
   public visibleChunkBounds = [999, 999, 999, 999];
   public visibleChunks = new Array<Chunk>();

   public readonly potentialVisibleEntities = new Array<Entity>();
   /** The number of times each potential visible game object appears in the mob's visible chunks */
   public readonly potentialVisibleEntityAppearances = new Array<number>();

   public readonly visionRange: number;
   public visibleEntities = new Array<Entity>();

   constructor(visionRange: number) {
      this.visionRange = visionRange;
   }
}

export const AIHelperComponentArray = new ComponentArray<AIHelperComponent>(true);

const hitboxIsVisible = (entity: Entity, hitbox: Hitbox, visionRange: number): boolean => {
   if ((hitbox as any).radius !== undefined) {
      // Circular hitbox
      return circlesDoIntersect(entity.position.x, entity.position.y, visionRange, hitbox.x, hitbox.y, (hitbox as CircularHitbox).radius);
   } else {
      // Rectangular hitbox
      return circleAndRectangleDoIntersect(entity.position.x, entity.position.y, visionRange, hitbox.x, hitbox.y, (hitbox as RectangularHitbox).width, (hitbox as RectangularHitbox).height, (hitbox as RectangularHitbox).relativeRotation);
   }
}

const entityIsVisible = (entity: Entity, checkEntity: Entity, visionRange: number): boolean => {
   const xDiff = entity.position.x - checkEntity.position.x;
   const yDiff = entity.position.y - checkEntity.position.y;
   if (xDiff * xDiff + yDiff * yDiff <= visionRange * visionRange) {
      return true;
   }

   // If the mob can see any of the game object's hitboxes, it is visible
   for (let j = 0; j < checkEntity.hitboxes.length; j++) {
      const hitbox = checkEntity.hitboxes[j];
      if (hitboxIsVisible(entity, hitbox, visionRange)) {
         return true;
      }
   }

   return false;
}

const calculateVisibleEntities = (entity: Entity, aiHelperComponent: AIHelperComponent): Array<Entity> => {
   const visibleEntities = new Array<Entity>();

   const potentialVisibleEntities = aiHelperComponent.potentialVisibleEntities;
   const visionRange = aiHelperComponent.visionRange;

   for (let i = 0; i < potentialVisibleEntities.length; i++) {
      const currentEntity = potentialVisibleEntities[i];
      if (entityIsVisible(entity, currentEntity, visionRange)) {
         visibleEntities.push(currentEntity);
      }
   }

   return visibleEntities;
}

export function tickAIHelperComponent(entity: Entity): void {
   // @Speed: Not all entities with this component need this always.
   // Krumblid: probably can pass with 
   // Slimewisp: can pass with once per second
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(entity.id);
   
   const minChunkX = Math.max(Math.floor((entity.position.x - aiHelperComponent.visionRange) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((entity.position.x + aiHelperComponent.visionRange) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((entity.position.y - aiHelperComponent.visionRange) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((entity.position.y + aiHelperComponent.visionRange) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   
   // If the entity hasn't changed visible chunk bounds, then the potential visible entities will be the same
   // and only the visible entities need to updated
   if (minChunkX === aiHelperComponent.visibleChunkBounds[0] && maxChunkX === aiHelperComponent.visibleChunkBounds[1] && minChunkY === aiHelperComponent.visibleChunkBounds[2] && maxChunkY === aiHelperComponent.visibleChunkBounds[3]) {
      aiHelperComponent.visibleEntities = calculateVisibleEntities(entity, aiHelperComponent);
      return;
   }

   aiHelperComponent.visibleChunkBounds[0] = minChunkX;
   aiHelperComponent.visibleChunkBounds[1] = maxChunkX;
   aiHelperComponent.visibleChunkBounds[2] = minChunkY;
   aiHelperComponent.visibleChunkBounds[3] = maxChunkY;

   const newVisibleChunks = new Array<Chunk>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         newVisibleChunks.push(chunk);
      }
   }

   // Find all chunks which aren't present in the new chunks and remove them
   for (const chunk of aiHelperComponent.visibleChunks) {
      if (newVisibleChunks.indexOf(chunk) === -1) {
         // Remove previously visible chunk
         chunk.viewingEntities.splice(chunk.viewingEntities.indexOf(entity), 1);
         aiHelperComponent.visibleChunks.splice(aiHelperComponent.visibleChunks.indexOf(chunk), 1);

         // Remove game objects in the chunk from the potentially visible list
         const numGameObjects = chunk.entities.length;
         for (let i = 0; i < numGameObjects; i++) {
            const gameObject = chunk.entities[i];
            const idx = aiHelperComponent.potentialVisibleEntities.indexOf(gameObject);
            aiHelperComponent.potentialVisibleEntityAppearances[idx]--;
            if (aiHelperComponent.potentialVisibleEntityAppearances[idx] === 0) {
               aiHelperComponent.potentialVisibleEntities.splice(idx, 1);
               aiHelperComponent.potentialVisibleEntityAppearances.splice(idx, 1);
            }
         }
      }
   }

   // Add all new chunks
   for (const chunk of newVisibleChunks) {
      if (aiHelperComponent.visibleChunks.indexOf(chunk) === -1) {
         // Add new visible chunk
         chunk.viewingEntities.push(entity);
         aiHelperComponent.visibleChunks.push(chunk);

         // Add existing game objects to the potentially visible list
         const numEntities = chunk.entities.length;
         for (let i = 0; i < numEntities; i++) {
            const currentEntity = chunk.entities[i];
            const idx = aiHelperComponent.potentialVisibleEntities.indexOf(currentEntity);
            if (idx === -1 && currentEntity.id !== entity.id) {
               aiHelperComponent.potentialVisibleEntities.push(currentEntity);
               aiHelperComponent.potentialVisibleEntityAppearances.push(1);
            } else {
               aiHelperComponent.potentialVisibleEntityAppearances[idx]++;
            }
         }
      }
   }

   aiHelperComponent.visibleEntities = calculateVisibleEntities(entity, aiHelperComponent);
}

export function serialiseAIHelperComponent(entity: Entity): AIHelperComponentData {
   const aiHelperComponent = AIHelperComponentArray.getComponent(entity.id);
   
   return {
      visionRange: aiHelperComponent.visionRange
   };
}