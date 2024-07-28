import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";

class Reed extends Entity {
   constructor(id: number) {
      super(id, EntityType.reed);
   }
}

export default Reed;