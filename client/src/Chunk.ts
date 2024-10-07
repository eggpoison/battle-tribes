import { RiverSteppingStoneData } from "battletribes-shared/client-server-types";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { PhysicsComponentArray } from "./entity-components/PhysicsComponent";
import { getEntityType } from "./world";

class Chunk {
   public readonly x: number;
   public readonly y: number;

   public readonly entities = new Array<EntityID>();
   public readonly nonGrassEntities = new Array<EntityID>();
   public readonly physicsEntities = new Array<EntityID>();

   public readonly riverSteppingStones = new Array<RiverSteppingStoneData>();

   constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
   }

   public addEntity(entity: EntityID): void {
      this.entities.push(entity);

      if (PhysicsComponentArray.hasComponent(entity)) {
         this.physicsEntities.push(entity);
      }

      if (getEntityType(entity) !== EntityType.grassStrand) {
         this.nonGrassEntities.push(entity);
      }
   }

   public removeEntity(entity: EntityID): void {
      const idx = this.entities.indexOf(entity);
      this.entities.splice(idx, 1);

      if (PhysicsComponentArray.hasComponent(entity)) {
         const idx = this.physicsEntities.indexOf(entity);
         this.physicsEntities.splice(idx, 1);
      }

      if (getEntityType(entity) !== EntityType.grassStrand) {
         const idx = this.nonGrassEntities.indexOf(entity);
         this.nonGrassEntities.splice(idx, 1);
      }
   }
}

export default Chunk;