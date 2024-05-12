import { RiverSteppingStoneData } from "webgl-test-shared/dist/client-server-types";
import Entity from "./Entity";

class Chunk {
   public readonly x: number;
   public readonly y: number;

   public readonly entities = new Array<Entity>();

   public readonly riverSteppingStones = new Array<RiverSteppingStoneData>();

   constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
   }

   public addEntity(entity: Entity): void {
      this.entities.push(entity);
   }

   public removeEntity(entity: Entity): void {
      const idx = this.entities.indexOf(entity);
      this.entities.splice(idx, 1);
   }
}

export default Chunk;