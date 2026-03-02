import { Entity } from "battletribes-shared/entities";

export default class CollisionChunk {
   public readonly entities = new Array<Entity>();

   // @Cleanup
   // /** All collision relevant entities in the chunk */
   // public readonly collisionRelevantEntities = new Array<Entity>();
   // /** All collision relevant entities in the chunk with a physics component */
   // public readonly collisionRelevantPhysicsEntities = new Array<Entity>();
}