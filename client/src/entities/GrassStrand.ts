import Entity from "../Entity";
import { EntityType } from "webgl-test-shared/dist/entities";

class GrassStrand extends Entity {
   constructor(id: number) {
      super(id, EntityType.grassStrand);
   }
}

export default GrassStrand;