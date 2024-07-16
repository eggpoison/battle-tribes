import { RiverSteppingStoneData } from "webgl-test-shared/dist/client-server-types";
import { EntityID } from "webgl-test-shared/dist/entities";

class Chunk {
   public readonly x: number;
   public readonly y: number;

   public readonly entities = new Array<EntityID>();

   public readonly riverSteppingStones = new Array<RiverSteppingStoneData>();

   constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
   }

   public addEntity(entity: EntityID): void {
      this.entities.push(entity);
   }

   public removeEntity(entity: EntityID): void {
      const idx = this.entities.indexOf(entity);
      this.entities.splice(idx, 1);
   }
}

export default Chunk;