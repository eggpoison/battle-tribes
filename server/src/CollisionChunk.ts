import { EntityID } from "../../shared/src/entities";

export default class CollisionChunk {
   public readonly entities = new Array<EntityID>();

   // @Cleanup
   // /** All collision relevant entities in the chunk */
   // public readonly collisionRelevantEntities = new Array<EntityID>();
   // /** All collision relevant entities in the chunk with a physics component */
   // public readonly collisionRelevantPhysicsEntities = new Array<EntityID>();
}