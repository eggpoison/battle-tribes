import { Entity, EntityType } from "battletribes-shared/entities";
import { getEntityType } from "./world";

class Chunk {
   public readonly x: number;
   public readonly y: number;

   public readonly entities = new Array<Entity>();
   public readonly nonGrassEntities = new Array<Entity>();

   constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
   }

   public addEntity(entity: Entity): void {
      this.entities.push(entity);

      if (getEntityType(entity) !== EntityType.grassStrand) {
         this.nonGrassEntities.push(entity);
      }
   }

   public removeEntity(entity: Entity): void {
      const idx = this.entities.indexOf(entity);
      this.entities.splice(idx, 1);

      if (getEntityType(entity) !== EntityType.grassStrand) {
         const idx = this.nonGrassEntities.indexOf(entity);
         this.nonGrassEntities.splice(idx, 1);
      }
   }
}

export default Chunk;