import { RiverSteppingStoneData } from "webgl-test-shared/dist/client-server-types";
import { EntityID } from "webgl-test-shared/dist/entities";
import Entity from "./Entity";
import { ServerComponentType } from "webgl-test-shared/dist/components";

class Chunk {
   public readonly x: number;
   public readonly y: number;

   public readonly entities = new Array<EntityID>();
   public readonly physicsEntities = new Array<EntityID>();

   public readonly riverSteppingStones = new Array<RiverSteppingStoneData>();

   constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
   }

   public addEntity(entity: Entity): void {
      this.entities.push(entity.id);
      if (entity.hasServerComponent(ServerComponentType.physics)) {
         this.physicsEntities.push(entity.id);
      }
   }

   public removeEntity(entity: Entity): void {
      const idx = this.entities.indexOf(entity.id);
      this.entities.splice(idx, 1);

      if (entity.hasServerComponent(ServerComponentType.physics)) {
         const idx = this.physicsEntities.indexOf(entity.id);
         this.physicsEntities.splice(idx, 1);
      }
   }
}

export default Chunk;