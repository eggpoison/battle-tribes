import { Entity } from "battletribes-shared";

export default class CollisionChunk {
   public readonly entities: Array<Entity> = [];

   // @Cleanup
   // /** All collision relevant entities in the chunk */
   // public readonly collisionRelevantEntities: Array<Entity> = [];
   // /** All collision relevant entities in the chunk with a physics component */
   // public readonly collisionRelevantPhysicsEntities: Array<Entity> = [];
}