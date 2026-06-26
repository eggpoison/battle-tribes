import { Entity, EntityType } from "../../../shared/src/entities";
import { assert } from "../../../shared/src/utils";
import { getEntityType } from "./world";

class Chunk {
   public readonly entities: Entity[] = [];
   public readonly nonGrassEntities: Entity[] = [];

   public addEntity(entity: Entity): void {
      this.entities.push(entity);

      if (getEntityType(entity) !== EntityType.grassStrand) {
         this.nonGrassEntities.push(entity);
      }
   }

   public removeEntity(entity: Entity): void {
      const idx = this.entities.indexOf(entity);
      assert(idx !== -1);
      this.entities.splice(idx, 1);

      if (getEntityType(entity) !== EntityType.grassStrand) {
         const idx = this.nonGrassEntities.indexOf(entity);
         assert(idx !== -1);
         this.nonGrassEntities.splice(idx, 1);
      }
   }
}

export default Chunk;